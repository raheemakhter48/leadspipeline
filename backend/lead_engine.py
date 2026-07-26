import hashlib
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


SEARCH_TIMEOUT = 8
CRAWL_TIMEOUT = 4
CRAWL_WORKERS = 8
DISCOVERY_CRAWL_MULTIPLIER = 2
DISCOVERY_CRAWL_MAX = 48
DISCOVERY_BATCH_SIZE = 16
PROVIDER_QUERY_LIMIT = 3
PERPLEXITY_TIMEOUT = 12
PERPLEXITY_MAX_RESULTS = 20
SERPER_TIMEOUT = 10
SERPER_MAX_RESULTS = 20
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
    target = normalize_url(input_data.get("targetWebsite", ""))
    if target and "example.com" not in target:
        discovered.append({
            "title": domain_to_name(target),
            "url": target,
            "snippet": "Target website provided by user.",
            "source": "target_website",
        })
    if include_web:
        search_locations = expanded_search_locations(input_data, location)
        perplexity_results = []
        serper_results = []
        public_results = []
        for search_location in search_locations:
            perplexity_results.extend(search_perplexity(input_data, search_location, limit))
            serper_results.extend(search_serper(input_data, search_location, limit))
            if len(search_locations) == 1:
                public_results.extend(search_public_web(input_data, search_location, limit))
            if len(perplexity_results) + len(serper_results) >= limit * 5:
                break
        discovered.extend(perplexity_results)
        discovered.extend(serper_results)
        discovered.extend(public_results)
        print(
            f"[ready-search] discovery location={location!r} search_locations={len(search_locations)} service={input_data.get('service')!r} "
            f"category={input_data.get('category')!r} perplexity={len(perplexity_results)} "
            f"serper={len(serper_results)} web={len(public_results)}",
            flush=True,
        )
    map_results = search_openstreetmap(input_data, location, limit)
    discovered.extend(map_results)

    unique_sites = dedupe_discoveries(discovered)
    leads: list[dict[str, Any]] = []

    leads.extend(build_leads_from_discoveries(unique_sites, input_data, location, fetch_contacts, excluded_ids, limit, strict=True))
    strict_count = len(leads)
    if not leads:
        leads.extend(build_leads_from_discoveries(unique_sites, input_data, location, fetch_contacts, excluded_ids, limit, strict=False))

    final_leads = sorted(leads, key=lambda lead: lead["aiScore"], reverse=True)[:limit]
    print(
        f"[ready-search] discovered={len(discovered)} unique={len(unique_sites)} maps={len(map_results)} strict_email_leads={strict_count} "
        f"email_leads={len(final_leads)}",
        flush=True,
    )
    return final_leads


def build_leads_from_discoveries(
    unique_sites: list[dict[str, str]],
    input_data: dict[str, Any],
    location: str,
    fetch_contacts: bool,
    excluded_ids: set[str],
    limit: int,
    strict: bool,
) -> list[dict[str, Any]]:
    leads: list[dict[str, Any]] = []
    candidates = unique_sites[: min(max(limit * DISCOVERY_CRAWL_MULTIPLIER, DISCOVERY_BATCH_SIZE), DISCOVERY_CRAWL_MAX)]
    for offset in range(0, len(candidates), DISCOVERY_BATCH_SIZE):
        batch = candidates[offset : offset + DISCOVERY_BATCH_SIZE]
        with ThreadPoolExecutor(max_workers=CRAWL_WORKERS) as executor:
            futures = {
                executor.submit(build_lead, item, input_data, location, offset + index, fetch_contacts, strict): item
                for index, item in enumerate(batch)
            }
            for future in as_completed(futures):
                lead = future.result()
                if not lead:
                    continue
                if lead.get("id") in excluded_ids:
                    continue
                if not lead.get("email"):
                    continue
                if input_data.get("directDial") and not lead.get("phone"):
                    continue
                leads.append(lead)
                if len(leads) >= limit:
                    break
        if len(leads) >= limit:
            break
    return leads


def search_perplexity(input_data: dict[str, Any], location: str, limit: int) -> list[dict[str, str]]:
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        return []

    results: list[dict[str, str]] = []
    country = country_code(input_data.get("country", ""))
    per_query = min(PERPLEXITY_MAX_RESULTS, max(8, min(limit, 20)))
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for query in build_queries(input_data, location)[:PROVIDER_QUERY_LIMIT]:
        payload: dict[str, Any] = {
            "query": query,
            "max_results": per_query,
            "max_tokens_per_page": 2500,
        }
        if country:
            payload["country"] = country

        try:
            response = requests.post(
                "https://api.perplexity.ai/search",
                headers=headers,
                json=payload,
                timeout=PERPLEXITY_TIMEOUT,
            )
            if not response.ok:
                continue
            for item in response.json().get("results", []):
                normalized = normalize_search_item(item, "perplexity_search")
                if normalized and is_business_url(normalized.get("url", "")):
                    results.append(normalized)
        except Exception:
            continue
        if len(results) >= limit * 5:
            break
    return results


def search_serper(input_data: dict[str, Any], location: str, limit: int) -> list[dict[str, str]]:
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        return []

    results: list[dict[str, str]] = []
    country = country_code(input_data.get("country", ""))
    per_query = min(SERPER_MAX_RESULTS, max(8, min(limit, 20)))
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }

    for query in build_queries(input_data, location)[:PROVIDER_QUERY_LIMIT]:
        payload: dict[str, Any] = {
            "q": query,
            "num": per_query,
            "hl": "en",
        }
        if country:
            payload["gl"] = country.lower()
        if location:
            payload["location"] = location

        try:
            response = requests.post(
                "https://google.serper.dev/search",
                headers=headers,
                json=payload,
                timeout=SERPER_TIMEOUT,
            )
            if not response.ok:
                continue
            for item in response.json().get("organic", []):
                normalized = normalize_search_item(item, "serper_search")
                if normalized and is_business_url(normalized.get("url", "")):
                    results.append(normalized)
        except Exception:
            continue
        if len(results) >= limit * 5:
            break
    return results


def search_public_web(input_data: dict[str, Any], location: str, limit: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for query in build_queries(input_data, location)[:PROVIDER_QUERY_LIMIT]:
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
                normalized = normalize_search_item({"title": title, "url": url, "snippet": text}, "web_search")
                if normalized and title and is_business_url(normalized.get("url", "")):
                    results.append(normalized)
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


def build_lead(item: dict[str, str], input_data: dict[str, Any], location: str, index: int, fetch_contacts: bool, strict: bool = True) -> dict[str, Any] | None:
    website = normalize_url(item.get("url", ""))
    if not is_relevant_discovery(item, input_data, location, strict):
        return None
    contact = crawl_contact(website) if fetch_contacts and website else {"email": "", "phone": "", "socialLinks": []}
    phone = item.get("phone") or contact["phone"]
    email = item.get("email") or contact["email"]
    score = score_lead(website=website, email=email, phone=phone, source=item.get("source", "web_search"), index=index)

    if (not item.get("title") and not website) or not email:
        return None

    return {
        "id": f"ready-{hash_text(website or item.get('title', '') + location)}",
        "businessName": clean_business_name(item.get("title", ""), website),
        "category": input_data.get("category") or "Business",
        "address": compact_address(item.get("snippet", ""), location),
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
    stage = input_data.get("stage") or "Growth Stage"
    negatives = "-directory -list -jobs -course -template -examples -wikipedia -linkedin -facebook -semrush -clutch"
    variants = category_variants(category)
    service_terms = service_variants(service)
    category_filter = "" if category in ("Healthcare", "Local Businesses") else category
    queries = [
        f'{service} companies in {location} contact email phone website {negatives}',
        f'{service} providers {location} "contact us" email website {negatives}',
        f'{service} agency {location} email phone website {negatives}',
        f'{service} services {location} business contact email {negatives}',
        f'{service} {stage} company {location} email website {negatives}',
    ]
    if category_filter:
        queries.extend([
            f'{category_filter} {service} companies in {location} contact email website {negatives}',
            f'{category_filter} businesses {location} contact email website {negatives}',
        ])
    else:
        queries.append(f'business services companies in {location} contact email website {negatives}')
    for term in service_terms:
        queries.append(f"{term} {location} contact email website {negatives}")
        queries.append(f"{term} company {location} phone email {negatives}")
    for variant in variants:
        if category_filter:
            queries.append(f"{variant} {location} website contact email {negatives}")
            queries.append(f"{variant} {service} {location} phone email website {negatives}")
    return list(dict.fromkeys(queries))


def normalize_search_item(item: dict[str, Any], source: str) -> dict[str, str] | None:
    snippet = decode_html(str(item.get("snippet") or item.get("description") or ""))
    title = decode_html(str(item.get("title") or ""))
    url = normalize_url(str(item.get("url") or item.get("link") or ""))
    snippet_urls = extract_urls(snippet)
    if not is_business_url(url):
        url = next((candidate for candidate in snippet_urls if is_business_url(candidate)), url)
    email = prefer_email(extract_emails(snippet))
    phone = prefer_phone(extract_phones(snippet))
    if not title and not url:
        return None
    return {
        "title": title,
        "url": url,
        "snippet": snippet,
        "email": email,
        "phone": phone,
        "source": source,
    }


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


def service_variants(service: str) -> list[str]:
    variants = {
        "IT Support": ["managed IT services", "IT support company", "computer support", "network support", "MSP"],
        "Cybersecurity": ["cybersecurity company", "managed security services", "information security consultant"],
        "Cloud Services": ["cloud services provider", "cloud consulting company", "AWS Azure consultant"],
        "Web Design": ["web design company", "website design agency", "web development company"],
        "SEO Services": ["SEO agency", "local SEO company", "digital marketing agency"],
        "Content Marketing": ["content marketing agency", "content strategy agency", "digital marketing agency", "SEO content agency"],
        "Lead Generation": ["lead generation agency", "B2B lead generation company"],
        "AI Automation": ["AI automation agency", "business automation consultant"],
        "SaaS Development": ["software development company", "SaaS development agency"],
        "Mobile App Development": ["mobile app development company", "app development agency"],
        "Data Scraping": ["data scraping service", "web scraping company"],
        "Data Enrichment": ["data enrichment service", "B2B data provider"],
    }
    return variants.get(service, [service])


def service_category(service: str) -> str:
    if service in {"SEO Services", "Content Marketing", "Paid Ads", "Social Media Marketing", "Local SEO", "Reputation Management"}:
        return "marketing"
    if service in {"Web Design", "WordPress Development", "Shopify Development", "E-commerce Development"}:
        return "website"
    if service in {"IT Support", "Cybersecurity", "Cloud Services"}:
        return "it services"
    return service.lower()


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


def extract_urls(text: str) -> list[str]:
    urls = re.findall(r"https?://[^\s<>\]\)\"']+", text, flags=re.I)
    return [normalize_url(url.rstrip(".,;:")) for url in urls if normalize_url(url)]


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
    if source == "perplexity_search":
        score += 8
    if source == "serper_search":
        score += 6
    if source == "open_maps":
        score += 4
    return max(35, min(98, score - (index % 9)))


def is_business_url(url: str) -> bool:
    host = domain(url)
    if not host:
        return False
    blocked = (
        ".gov",
        ".mil",
        "facebook.com",
        "instagram.com",
        "linkedin.com",
        "lnkd.in",
        "youtube.com",
        "yelp.com",
        "wikipedia.org",
        "usembassy.gov",
        "state.gov",
        "navy.mil",
        "army.mil",
        "af.mil",
        "marines.mil",
        "scribd.com",
        "slideshare.net",
        "issuu.com",
        "academia.edu",
        "researchgate.net",
        "indeed.com",
        "glassdoor.com",
        "bebee.com",
        "ziprecruiter.com",
        "simplyhired.com",
        "monster.com",
        "crunchbase.com",
        "apollo.io",
        "zoominfo.com",
        "semrush.com",
        "clutch.co",
        "sortlist.",
        "designrush.",
        "goodfirms.",
        "themanifest.",
        "upcity.",
    )
    return not any(item in host for item in blocked)


def is_relevant_discovery(item: dict[str, str], input_data: dict[str, Any], location: str, strict: bool = True) -> bool:
    website = normalize_url(item.get("url", ""))
    text = f"{item.get('title', '')} {item.get('snippet', '')} {website}".lower()
    if not is_business_url(website):
        return False
    blocked_terms = (
        "privacy policy",
        "terms of service",
        "cookie policy",
        "embassy",
        "consulate",
        "government",
        "navy",
        "army",
        "job offers",
        "jobs in",
        "careers only",
        "salary",
        "resume",
        "document/",
        "pdf",
    )
    if any(term in text for term in blocked_terms):
        return False
    if not strict:
        return True

    service = input_data.get("service", "") or ""
    service_hits = service_variants(service)
    category_hits = category_variants(input_data.get("category", "") or "")
    service_relevant = any(term.lower() in text for term in [service, *service_hits] if term)
    service_relevant = service_relevant or service_category(service) in text
    category = input_data.get("category", "")
    category_relevant = category in ("Local Businesses", "Healthcare") or any(term.lower() in text for term in [category, *category_hits] if term)

    country = str(input_data.get("country", "")).lower()
    city = "" if input_data.get("city") == "All Cities" else str(input_data.get("city", "")).lower()
    state = "" if input_data.get("state") == "All Regions" else str(input_data.get("state", "")).lower()
    location_relevant = bool(country and country in text) or bool(city and city in text) or bool(state and state in text)
    if location == input_data.get("country"):
        location_relevant = location_relevant or ".com" in domain(website)

    return category_relevant and location_relevant and service_relevant


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


def expanded_search_locations(input_data: dict[str, Any], location: str) -> list[str]:
    if input_data.get("city") != "All Cities" or input_data.get("state") != "All Regions":
        return [location]

    cities = {
        "United States": ["Los Angeles, California, United States", "Dallas, Texas, United States", "New York, New York, United States", "Chicago, Illinois, United States", "Miami, Florida, United States"],
        "United Kingdom": ["London, England, United Kingdom", "Manchester, England, United Kingdom", "Birmingham, England, United Kingdom"],
        "Canada": ["Toronto, Ontario, Canada", "Vancouver, British Columbia, Canada", "Calgary, Alberta, Canada"],
        "Australia": ["Sydney, New South Wales, Australia", "Melbourne, Victoria, Australia", "Brisbane, Queensland, Australia"],
        "Pakistan": ["Lahore, Punjab, Pakistan", "Karachi, Sindh, Pakistan", "Islamabad, Pakistan"],
        "India": ["Mumbai, Maharashtra, India", "Delhi, India", "Bengaluru, Karnataka, India"],
        "United Arab Emirates": ["Dubai, United Arab Emirates", "Abu Dhabi, United Arab Emirates", "Sharjah, United Arab Emirates"],
    }
    return cities.get(input_data.get("country", ""), [location])


def country_code(country: str) -> str:
    codes = {
        "United States": "US",
        "United Kingdom": "GB",
        "Canada": "CA",
        "Australia": "AU",
        "Pakistan": "PK",
        "India": "IN",
        "United Arab Emirates": "AE",
        "Saudi Arabia": "SA",
        "Germany": "DE",
        "France": "FR",
        "Spain": "ES",
        "Italy": "IT",
        "Netherlands": "NL",
        "Singapore": "SG",
    }
    normalized = (country or "").strip()
    if len(normalized) == 2:
        return normalized.upper()
    return codes.get(normalized, "")


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


def clean_business_name(title: str, website: str) -> str:
    cleaned = clean_title(title)
    if cleaned.lower() in ("contact", "contact us", "privacy policy", "locations", "our locations"):
        return domain_to_name(website)
    return cleaned


def compact_address(snippet: str, fallback: str) -> str:
    text = decode_html(snippet)
    if not text:
        return fallback
    text = re.sub(r"\s+", " ", text).strip()
    address_markers = ("address", "location", "office", "headquarters", "hq")
    sentences = re.split(r"(?<=[.!?])\s+| \.\.\. ", text)
    preferred = next((sentence for sentence in sentences if any(marker in sentence.lower() for marker in address_markers)), "")
    compact = preferred or text
    return compact[:260].rstrip(" ,.;:-") or fallback


def decode_html(value: str) -> str:
    return BeautifulSoup(value or "", "html.parser").get_text(" ")


def bad_email(email: str) -> bool:
    value = email.lower()
    host = value.split("@")[-1] if "@" in value else ""
    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    if len(tld) < 2 or tld in {"fct", "xxx", "test", "local", "invalid"}:
        return True
    return any(term in value for term in (".png", ".jpg", ".jpeg", ".gif", ".webp", "example.com", "domain.com", "sentry.io"))


def hash_text(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8", errors="ignore")).hexdigest()[:16]
