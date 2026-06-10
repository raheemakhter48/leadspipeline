import hashlib
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


SEARCH_TIMEOUT = 8
CRAWL_TIMEOUT = 7
CRAWL_WORKERS = 8
CONTACT_PATH_HINTS = (
    "contact",
    "contact-us",
    "about",
    "about-us",
    "team",
    "staff",
    "locations",
    "office",
    "support",
)


def search_ready_leads(input_data: dict[str, Any]) -> list[dict[str, Any]]:
    limit = max(1, min(int(input_data.get("max") or 50), 500))
    excluded_ids = set(input_data.get("excludedLeadIds") or [])
    include_web = bool(input_data.get("includeWebResults", True))
    fetch_contacts = bool(input_data.get("fetchContacts", True))
    location = build_location(input_data)

    discovered = []
    if include_web:
      discovered.extend(search_public_web(input_data, location, limit))
    discovered.extend(search_openstreetmap(input_data, location, limit))

    unique_sites = dedupe_discoveries(discovered)
    leads: list[dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=CRAWL_WORKERS) as executor:
        futures = {
            executor.submit(build_lead, item, input_data, location, index, fetch_contacts): item
            for index, item in enumerate(unique_sites[: min(limit * 4, 220)])
        }
        for future in as_completed(futures):
            lead = future.result()
            if not lead:
                continue
            if lead.get("id") in excluded_ids:
                continue
            if input_data.get("emailVerified") and not lead.get("email"):
                continue
            if input_data.get("directDial") and not lead.get("phone"):
                continue
            leads.append(lead)
            if len(leads) >= limit:
                break

    return sorted(leads, key=lambda lead: lead["aiScore"], reverse=True)[:limit]


def search_public_web(input_data: dict[str, Any], location: str, limit: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for query in build_queries(input_data, location)[:14]:
        try:
            response = requests.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                headers={"User-Agent": "Mozilla/5.0 (compatible; LeadsPipeline/1.0)"},
                timeout=SEARCH_TIMEOUT,
            )
            if not response.ok:
                continue
            soup = BeautifulSoup(response.text, "html.parser")
            for result in soup.select(".result"):
                link = result.select_one(".result__a")
                if not link:
                    continue
                url = decode_duckduckgo_url(link.get("href", ""))
                title = link.get_text(" ", strip=True)
                snippet = result.select_one(".result__snippet")
                text = snippet.get_text(" ", strip=True) if snippet else ""
                if title and is_business_url(url):
                    results.append({"title": title, "url": url, "snippet": text, "source": "web_search"})
        except Exception:
            continue
        if len(results) >= limit * 5:
            break
    return results


def search_openstreetmap(input_data: dict[str, Any], location: str, limit: int) -> list[dict[str, str]]:
    try:
        geo = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"format": "json", "limit": "1", "q": location},
            headers={"User-Agent": "LeadsPipeline/1.0"},
            timeout=SEARCH_TIMEOUT,
        )
        if not geo.ok or not geo.json():
            return []
        place = geo.json()[0]
        tags = osm_tags_for(input_data.get("category", "business"))
        selectors = "\n".join(
            f'node{tag}(around:25000,{place["lat"]},{place["lon"]});'
            f'way{tag}(around:25000,{place["lat"]},{place["lon"]});'
            f'relation{tag}(around:25000,{place["lat"]},{place["lon"]});'
            for tag in tags
        )
        query = f"[out:json][timeout:25];({selectors});out center tags {limit};"
        response = requests.get(
            "https://overpass-api.de/api/interpreter",
            params={"data": query},
            headers={"User-Agent": "LeadsPipeline/1.0"},
            timeout=SEARCH_TIMEOUT + 10,
        )
        if not response.ok:
            return []
        items = []
        for element in response.json().get("elements", []):
            tags = element.get("tags", {})
            name = tags.get("name", "")
            if not name:
                continue
            lat = element.get("lat") or element.get("center", {}).get("lat")
            lon = element.get("lon") or element.get("center", {}).get("lon")
            website = tags.get("website") or tags.get("contact:website") or ""
            items.append({
                "title": name,
                "url": normalize_url(website),
                "snippet": format_address(tags),
                "phone": tags.get("phone") or tags.get("contact:phone") or "",
                "maps": f"https://www.google.com/maps/search/?api=1&query={lat},{lon}" if lat and lon else "",
                "source": "open_maps",
            })
        return items
    except Exception:
        return []


def build_lead(item: dict[str, str], input_data: dict[str, Any], location: str, index: int, fetch_contacts: bool) -> dict[str, Any] | None:
    website = normalize_url(item.get("url", ""))
    contact = crawl_contact(website) if fetch_contacts and website else {"email": "", "phone": "", "socialLinks": []}
    phone = item.get("phone") or contact["phone"]
    email = contact["email"]
    score = score_lead(website=website, email=email, phone=phone, source=item.get("source", "web_search"), index=index)

    if not item.get("title") and not website:
        return None

    return {
        "id": f"ready-{hash_text(website or item.get('title', '') + location)}",
        "businessName": clean_title(item.get("title", "") or domain_to_name(website)),
        "category": input_data.get("category") or "Business",
        "address": item.get("snippet") or location,
        "phone": phone,
        "email": email,
        "website": website,
        "socialLinks": contact["socialLinks"],
        "googleMapsUrl": item.get("maps", ""),
        "rating": 0,
        "reviewCount": 0,
        "location": location,
        "country": input_data.get("country") or location.split(",")[-1].strip(),
        "source": item.get("source", "web_search"),
        "aiScore": score,
        "temperature": "Hot" if score >= 78 else "Warm" if score >= 52 else "Cold",
        "status": "new",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


def crawl_contact(website: str) -> dict[str, Any]:
    pages = scrape_pages(website)
    emails = []
    phones = []
    socials = []
    for html, url in pages:
        emails.extend(extract_emails(html))
        phones.extend(extract_phones(html))
        socials.extend(extract_social_links(html, url))
    return {
        "email": prefer_email(emails),
        "phone": prefer_phone(phones),
        "socialLinks": list(dict.fromkeys(socials))[:5],
    }


def scrape_pages(website: str) -> list[tuple[str, str]]:
    homepage = fetch_html(website)
    if not homepage:
        return []
    html, final_url = homepage
    links = contact_links(html, final_url)
    pages = [(html, final_url)]
    for link in links[:3]:
        page = fetch_html(link)
        if page:
            pages.append(page)
    return pages


def fetch_html(url: str) -> tuple[str, str] | None:
    try:
        response = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; LeadsPipeline/1.0)"},
            timeout=CRAWL_TIMEOUT,
            allow_redirects=True,
        )
        if not response.ok or "text/html" not in response.headers.get("content-type", ""):
            return None
        return response.text[:900000], response.url
    except Exception:
        return None


def contact_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls = []
    for link in soup.select("a[href]"):
        href = link.get("href", "")
        url = urljoin(base_url, href).split("#")[0]
        path = urlparse(url).path.lower()
        if any(hint in path for hint in CONTACT_PATH_HINTS) and same_domain(base_url, url):
            urls.append(url)
    return list(dict.fromkeys(urls))


def build_queries(input_data: dict[str, Any], location: str) -> list[str]:
    category = input_data.get("category") or "business"
    service = input_data.get("service") or "services"
    negatives = "-directory -list -jobs -course -template -examples -wikipedia"
    variants = category_variants(category)
    queries = [
        f'{category} {location} contact email website {negatives}',
        f'{category} {service} {location} business website {negatives}',
        f'{category} {location} "contact us" "email" {negatives}',
        f'{category} {location} "about us" "contact" {negatives}',
    ]
    for variant in variants:
        queries.append(f"{variant} {location} website contact email {negatives}")
        queries.append(f"{variant} {location} phone website {negatives}")
    return list(dict.fromkeys(queries))


def category_variants(category: str) -> list[str]:
    variants = {
        "Healthcare": ["clinic", "medical clinic", "doctor office", "urgent care", "health center"],
        "Dental": ["dentist", "dental clinic", "orthodontist", "cosmetic dentist"],
        "Fitness": ["gym", "fitness studio", "personal training", "yoga studio"],
        "Restaurants": ["restaurant", "cafe", "bistro", "catering"],
        "Real Estate": ["real estate agency", "realtor", "property management"],
        "Home Services": ["plumber", "HVAC", "electrician", "roofing", "cleaning service"],
        "E-commerce": ["online store", "ecommerce brand", "boutique"],
        "SaaS": ["software company", "SaaS company", "technology company"],
    }
    return variants.get(category, [category])


def osm_tags_for(category: str) -> list[str]:
    normalized = category.lower()
    if "dental" in normalized:
        return ['["amenity"="dentist"]', '["healthcare"="dentist"]']
    if "health" in normalized:
        return ['["amenity"="clinic"]', '["amenity"="hospital"]', '["healthcare"]']
    if "fitness" in normalized:
        return ['["leisure"="fitness_centre"]', '["sport"="fitness"]']
    if "restaurant" in normalized:
        return ['["amenity"="restaurant"]', '["amenity"="cafe"]']
    if "real estate" in normalized:
        return ['["office"="estate_agent"]']
    return ['["name"]']


def dedupe_discoveries(items: list[dict[str, str]]) -> list[dict[str, str]]:
    seen = set()
    unique = []
    for item in items:
        key = domain(item.get("url", "")) or item.get("title", "").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def extract_emails(html: str) -> list[str]:
    text = decode_html(html)
    text = re.sub(r"\s*(\[at]|\(at\)|\sat\s)\s*", "@", text, flags=re.I)
    text = re.sub(r"\s*(\[dot]|\(dot\)|\sdot\s)\s*", ".", text, flags=re.I)
    emails = re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, flags=re.I)
    return [email.lower() for email in emails if not bad_email(email)]


def extract_phones(html: str) -> list[str]:
    text = BeautifulSoup(html, "html.parser").get_text(" ")
    phones = re.findall(r"(?:\+?\d[\d\s().-]{7,}\d)", text)
    return [re.sub(r"\s+", " ", phone).strip() for phone in phones if len(re.sub(r"\D", "", phone)) >= 8]


def extract_social_links(html: str, base_url: str) -> list[str]:
    socials = []
    for href in re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.I):
        url = urljoin(base_url, href)
        if any(host in url for host in ("linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com", "youtube.com", "tiktok.com")):
            socials.append(url)
    return socials


def prefer_email(emails: list[str]) -> str:
    clean = list(dict.fromkeys(email for email in emails if not email.startswith(("noreply@", "no-reply@", "privacy@", "legal@"))))
    for prefix in ("info@", "contact@", "hello@", "sales@", "support@", "office@", "admin@"):
        match = next((email for email in clean if email.startswith(prefix)), "")
        if match:
            return match
    return clean[0] if clean else ""


def prefer_phone(phones: list[str]) -> str:
    unique = list(dict.fromkeys(phones))
    return sorted(unique, key=lambda phone: len(re.sub(r"\D", "", phone)), reverse=True)[0] if unique else ""


def score_lead(website: str, email: str, phone: str, source: str, index: int) -> int:
    score = 58
    if website:
        score += 12
    if email:
        score += 16
    if phone:
        score += 8
    if source == "open_maps":
        score += 4
    return max(35, min(98, score - (index % 9)))


def is_business_url(url: str) -> bool:
    host = domain(url)
    if not host:
        return False
    blocked = ("facebook.com", "instagram.com", "linkedin.com", "youtube.com", "yelp.com", "wikipedia.org", "crunchbase.com", "apollo.io", "zoominfo.com")
    return not any(item in host for item in blocked)


def decode_duckduckgo_url(href: str) -> str:
    try:
        parsed = urlparse(href)
        uddg = parse_qs(parsed.query).get("uddg", [""])[0]
        return unquote(uddg) if uddg else href
    except Exception:
        return href


def build_location(input_data: dict[str, Any]) -> str:
    parts = [
        "" if input_data.get("city") == "All Cities" else input_data.get("city", ""),
        "" if input_data.get("state") == "All Regions" else input_data.get("state", ""),
        input_data.get("country", ""),
    ]
    return ", ".join(part for part in parts if part)


def normalize_url(value: str) -> str:
    if not value:
        return ""
    try:
        with_protocol = value if value.startswith(("http://", "https://")) else f"https://{value}"
        parsed = urlparse(with_protocol)
        if not parsed.netloc:
            return ""
        return parsed.geturl()
    except Exception:
        return ""


def domain(url: str) -> str:
    try:
        return urlparse(normalize_url(url)).hostname.replace("www.", "")
    except Exception:
        return ""


def domain_to_name(url: str) -> str:
    host = domain(url)
    return host.split(".")[0].replace("-", " ").title() if host else "Unknown business"


def same_domain(left: str, right: str) -> bool:
    return domain(left) == domain(right)


def format_address(tags: dict[str, str]) -> str:
    return ", ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:city"), tags.get("addr:state"), tags.get("addr:postcode")]))


def clean_title(value: str) -> str:
    return re.sub(r"\s[-|].*$", "", decode_html(value)).strip() or "Unknown business"


def decode_html(value: str) -> str:
    return BeautifulSoup(value or "", "html.parser").get_text(" ")


def bad_email(email: str) -> bool:
    value = email.lower()
    return any(term in value for term in (".png", ".jpg", ".jpeg", ".gif", ".webp", "example.com", "domain.com", "sentry.io"))


def hash_text(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8", errors="ignore")).hexdigest()[:16]
