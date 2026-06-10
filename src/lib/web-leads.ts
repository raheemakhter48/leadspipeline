import type { Lead } from "@/lib/types";

type ReadySearchInput = {
  category: string;
  city: string;
  country: string;
  decisionMaker: boolean;
  directDial: boolean;
  emailVerified: boolean;
  fetchContacts: boolean;
  includeWebResults: boolean;
  max: number;
  service: string;
  stage: string;
  state: string;
  targetWebsite: string;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type ContactResult = {
  email: string;
  phone: string;
  socialLinks: string[];
};

type PageScrape = ContactResult & {
  links: string[];
  title: string;
};

const SEARCH_QUERY_LIMIT = 18;
const SEARCH_RESULT_LIMIT_PER_QUERY = 12;
const CRAWL_CONCURRENCY = 10;
const WEBSITE_TIMEOUT_MS = 3800;
const SEARCH_TIMEOUT_MS = 4500;
const HUNTER_TIMEOUT_MS = 4200;

export async function searchPublicWebLeads(input: ReadySearchInput): Promise<Lead[]> {
  const max = Math.min(Math.max(input.max, 1), 500);
  const location = [input.city !== "All Cities" ? input.city : "", input.state !== "All Regions" ? input.state : "", input.country]
    .filter(Boolean)
    .join(", ");

  const results = input.includeWebResults ? await runSearches(buildQueries(input, location), max) : [];
  const target = normalizeUrl(input.targetWebsite);
  const targeted = target && !target.includes("example.com") ? [{ title: hostnameToName(target), url: target, snippet: "Target website provided by user." }] : [];
  const allUnique = dedupeByDomain([...targeted, ...results]);
  const strict = allUnique.filter((result) => isRelevantResult(result, input) && !isLowQualityResult(result));
  const relaxed = allUnique.filter((result) => !isLowQualityResult(result));
  const unique = (strict.length > 0 ? strict : relaxed).slice(0, Math.min(Math.max(max * 8, 40), 240));

  const leads: Lead[] = [];

  for (const batch of chunk(unique, CRAWL_CONCURRENCY)) {
    const batchLeads = await Promise.all(
      batch.map(async (result, batchIndex) => {
        const contact = input.fetchContacts ? await enrichContact(result.url) : { email: "", phone: "", socialLinks: [] };
        const lead = toLead(result, input, location, leads.length + batchIndex, {
          email: contact.email,
          phone: input.directDial ? contact.phone : "",
          socialLinks: contact.socialLinks,
        });

        if (input.emailVerified && !lead.email) return null;
        return lead;
      }),
    );

    leads.push(...batchLeads.filter((lead): lead is Lead => Boolean(lead)));
    if (leads.length >= max) break;
  }

  return leads.slice(0, max);
}

async function runSearches(queries: string[], max: number) {
  const selectedQueries = queries.slice(0, SEARCH_QUERY_LIMIT);
  const perQueryLimit = Math.min(SEARCH_RESULT_LIMIT_PER_QUERY, Math.max(6, Math.ceil(max / 3)));
  const settled = await Promise.allSettled(selectedQueries.map((query) => searchDuckDuckGo(query, perQueryLimit)));
  const batches = settled.map((result) => (result.status === "fulfilled" ? result.value : []));
  return batches.flat();
}

async function searchDuckDuckGo(query: string, max: number): Promise<SearchResult[]> {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LeadEngineAI/0.1)",
      Accept: "text/html",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Web search failed: ${response.status}`);
  }

  const html = await response.text();
  const blocks = html.match(/<div class="result[\s\S]*?<\/div>\s*<\/div>/g) ?? [];

  return blocks
    .map((block) => {
      const href = extractMatch(block, /class="result__a"[^>]*href="([^"]+)"/);
      const title = stripHtml(extractMatch(block, /class="result__a"[^>]*>([\s\S]*?)<\/a>/));
      const snippet = stripHtml(extractMatch(block, /class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/));
      return { title, url: decodeDuckUrl(href), snippet };
    })
    .filter((result) => result.title && isBusinessUrl(result.url))
    .slice(0, max);
}

async function enrichContact(website: string): Promise<ContactResult> {
  const scraped = await crawlWebsiteContact(website);
  return scraped;
}

async function crawlWebsiteContact(website: string): Promise<ContactResult> {
  const startUrl = normalizeUrl(website);
  if (!startUrl) return { email: "", phone: "", socialLinks: [] };

  const homepage = await scrapePage(startUrl);
  if (homepage.email && homepage.phone) return mergeContactResults([homepage]);

  const contactUrls = pickContactUrls(homepage.links, startUrl);
  const pages = [
    homepage,
    ...(await Promise.all(contactUrls.filter((url) => url !== startUrl).slice(0, 3).map((url) => scrapePage(url)))),
  ];

  return mergeContactResults(pages);
}

async function scrapePage(website: string): Promise<PageScrape> {
  try {
    const response = await fetch(website, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEngineAI/0.1)" },
      cache: "no-store",
      signal: AbortSignal.timeout(WEBSITE_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return emptyPage();

    const text = await response.text();
    const phone = extractPhones(text)[0] ?? "";
    const email = extractEmails(text)[0] ?? "";
    const socialLinks = extractSocialLinks(text, website);
    const links = extractPageLinks(text, website);
    const title = stripHtml(extractMatch(text, /<title[^>]*>([\s\S]*?)<\/title>/i));
    return { email, links, phone, socialLinks, title };
  } catch {
    return emptyPage();
  }
}

async function hunterDomainEmail(website: string) {
  const apiKey = process.env.HUNTER_API_KEY;
  const domain = getDomain(website);
  if (!apiKey || !domain) return "";

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", "5");

  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(HUNTER_TIMEOUT_MS) });
    if (!response.ok) return "";
    const payload = (await response.json()) as {
      data?: { emails?: { value?: string; confidence?: number; type?: string }[] };
    };
    const emails = payload.data?.emails ?? [];
    const best = emails
      .filter((email) => email.value)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    return best?.value ?? "";
  } catch {
    return "";
  }
}

function toLead(result: SearchResult, input: ReadySearchInput, location: string, index: number, contact: ContactResult): Lead {
  const aiScore = Math.min(98, Math.max(50, 90 - (index % 14) * 3 + (contact.phone ? 6 : 0) + (contact.email ? 8 : 0) + (input.decisionMaker ? 4 : 0)));
  const temperature = aiScore >= 78 ? "Hot" : aiScore >= 52 ? "Warm" : "Cold";

  return {
    id: `web-${hashCode(result.url)}-${index}`,
    businessName: cleanBusinessName(result.title),
    category: input.category,
    address: location,
    phone: contact.phone,
    email: contact.email,
    website: result.url,
    socialLinks: contact.socialLinks,
    googleMapsUrl: "",
    rating: 0,
    reviewCount: 0,
    location,
    country: input.country,
    source: "web_search",
    aiScore,
    temperature,
    status: "new",
    createdAt: new Date().toISOString(),
  };
}

function extractSocialLinks(html: string, baseUrl: string) {
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const socialDomains = ["linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com", "tiktok.com"];
  const links = matches
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return "";
      }
    })
    .filter((url) => socialDomains.some((domain) => url.includes(domain)));

  return [...new Set(links)].slice(0, 5);
}

function extractPageLinks(html: string, baseUrl: string) {
  const baseDomain = getDomain(baseUrl);
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => decodeHtml(match[1]));

  return hrefs
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return "";
      }
    })
    .filter((url) => {
      const domain = getDomain(url);
      return domain === baseDomain && !isBlockedAsset(url);
    })
    .map((url) => url.split("#")[0])
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index)
    .slice(0, 40);
}

function pickContactUrls(links: string[], baseUrl: string) {
  const preferred = [
    "contact",
    "contact-us",
    "about",
    "about-us",
    "team",
    "staff",
    "leadership",
    "locations",
    "location",
    "office",
    "support",
  ];

  const ranked = links
    .map((url) => {
      const path = new URL(url).pathname.toLowerCase();
      const rank = preferred.findIndex((term) => path.includes(term));
      return { rank: rank === -1 ? 999 : rank, url };
    })
    .filter((item) => item.rank < 999)
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.url);

  return [baseUrl, ...ranked].filter((url, index, list) => list.indexOf(url) === index).slice(0, 4);
}

function mergeContactResults(pages: PageScrape[]): ContactResult {
  const emails = pages.flatMap((page) => page.email ? [page.email] : []);
  const phones = pages.flatMap((page) => page.phone ? [page.phone] : []);
  const socialLinks = [...new Set(pages.flatMap((page) => page.socialLinks))].slice(0, 5);

  return {
    email: preferBusinessEmail(emails),
    phone: preferPhone(phones),
    socialLinks,
  };
}

function extractEmails(html: string) {
  const deobfuscated = decodeHtml(html)
    .replace(/\s*\[at]\s*|\s*\(at\)\s*/gi, "@")
    .replace(/\s*\[dot]\s*|\s*\(dot\)\s*/gi, ".")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s+dot\s+/gi, ".");
  const mailto = [...deobfuscated.matchAll(/mailto:([^"'?]+)/gi)].map((match) => match[1]);
  const raw = [...deobfuscated.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0]);

  return [...new Set([...mailto, ...raw].map((email) => email.trim().toLowerCase()))]
    .filter((email) => !isBadEmail(email))
    .slice(0, 10);
}

function extractPhones(html: string) {
  const text = stripHtml(html);
  const raw = [...text.matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)].map((match) => match[0].trim());
  return [...new Set(raw)]
    .map((phone) => phone.replace(/\s+/g, " "))
    .filter((phone) => phone.replace(/\D/g, "").length >= 8)
    .filter((phone) => !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(phone))
    .slice(0, 8);
}

function preferBusinessEmail(emails: string[]) {
  const badPrefixes = ["noreply@", "no-reply@", "donotreply@", "privacy@", "legal@"];
  const goodPrefixes = ["info@", "contact@", "hello@", "sales@", "support@", "admin@", "office@", "enquiries@", "inquiries@"];
  const clean = [...new Set(emails)].filter((email) => !badPrefixes.some((prefix) => email.startsWith(prefix)));
  return clean.find((email) => goodPrefixes.some((prefix) => email.startsWith(prefix))) ?? clean[0] ?? "";
}

function preferPhone(phones: string[]) {
  return [...new Set(phones)].sort((a, b) => b.replace(/\D/g, "").length - a.replace(/\D/g, "").length)[0] ?? "";
}

function isBadEmail(email: string) {
  const value = email.toLowerCase();
  return [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    "example.com",
    "domain.com",
    "email.com",
    "sentry.io",
  ].some((term) => value.includes(term));
}

function isBlockedAsset(url: string) {
  return /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|rar|css|js|mp4|mp3|avi|mov|doc|docx|xls|xlsx)$/i.test(new URL(url).pathname);
}

function emptyPage(): PageScrape {
  return { email: "", links: [], phone: "", socialLinks: [], title: "" };
}

function dedupeByDomain(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const domain = getDomain(result.url);
    if (!domain || seen.has(domain)) return false;
    seen.add(domain);
    return true;
  });
}

function decodeDuckUrl(href: string) {
  const decoded = decodeHtml(href);
  try {
    const url = new URL(decoded, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : url.toString();
  } catch {
    return decoded;
  }
}

function isBusinessUrl(url: string) {
  const blocked = [
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
    "yelp.com",
    "tripadvisor.com",
    "wikipedia.org",
    "crunchbase.com",
    "clutch.co",
    "apollo.io",
    "zoominfo.com",
    "adapt.io",
    "rocketreach.co",
    "lusha.com",
    "signalhire.com",
    "growjo.com",
    "owler.com",
    "dnb.com",
    "sortlist.com",
    "designrush.com",
    "goodfirms.co",
    "themanifest.com",
    "contactout.com",
    "techdestination.com",
  ];
  const domain = getDomain(url);
  return Boolean(domain) && !blocked.some((item) => domain.includes(item));
}

function buildQueries(input: ReadySearchInput, location: string) {
  const category = categorySearchTerm(input.category);
  const service = serviceSearchTerm(input.service, input.category);
  const contact = input.decisionMaker ? "owner founder contact" : "contact";
  const negative = "-list -directory -top -best -jobs -course -funded -investors -database";
  const city = input.city !== "All Cities" ? input.city : "";
  const state = input.state !== "All Regions" ? input.state : "";
  const localLocation = [city, state].filter(Boolean).join(" ");
  const queryLocation = localLocation || location;

  const queries = [
    `${category} ${location} ${contact} website ${negative}`,
    `${category} ${service} ${location} contact website ${negative}`,
    `${category} company ${location} website contact ${negative}`,
    `${category} business ${location} email website ${negative}`,
    `${category} ${location} "mailto" website ${negative}`,
    `${category} ${location} "contact" "email" ${negative}`,
    `${input.category} ${queryLocation} email phone website ${negative}`,
    `${input.category} ${queryLocation} "contact us" website ${negative}`,
    `${input.category} ${queryLocation} "appointments" "contact" ${negative}`,
    `${input.category} ${queryLocation} "about us" "contact" ${negative}`,
    `${input.category} ${queryLocation} "locations" "contact" ${negative}`,
    `${service} ${input.category} ${queryLocation} business website ${negative}`,
  ];

  queries.push(...categoryQueryVariants(input.category, queryLocation, negative));

  if (input.service.includes("E-commerce") && input.category === "Healthcare") {
    queries.unshift(`online pharmacy medical ecommerce store ${location} contact website ${negative}`);
  }

  return [...new Set(queries)];
}

function categorySearchTerm(category: string) {
  const map: Record<string, string> = {
    Healthcare: "healthcare clinic OR medical practice",
    Dental: "dental clinic OR dentist",
    Fitness: "gym OR fitness studio",
    Restaurants: "restaurant",
    "Real Estate": "real estate agency OR realtor",
    "Home Services": "plumber OR HVAC OR electrician",
    "E-commerce": "online store OR ecommerce brand",
    SaaS: "software company OR SaaS",
  };

  return map[category] ?? category;
}

function serviceSearchTerm(service: string, category: string) {
  if (service.includes("E-commerce")) return category === "Healthcare" ? "online pharmacy medical ecommerce store" : "ecommerce online store";
  if (service.includes("SEO")) return "local business";
  if (service.includes("Web Design")) return "business";
  if (service.includes("CRM")) return "sales team";
  return service;
}

function isRelevantResult(result: SearchResult, input: ReadySearchInput) {
  const text = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const categoryTokens = input.category.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
  const serviceTokens = serviceSearchTerm(input.service, input.category).toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const categoryHit = categoryTokens.some((token) => text.includes(token)) || categoryAlias(input.category).some((token) => text.includes(token));
  const serviceHit = serviceTokens.some((token) => text.includes(token)) || input.service === "Lead Generation";

  return categoryHit || serviceHit;
}

function categoryAlias(category: string) {
  const aliases: Record<string, string[]> = {
    Healthcare: ["clinic", "medical", "health", "doctor", "pharmacy"],
    Dental: ["dentist", "dental"],
    Fitness: ["gym", "fitness"],
    Restaurants: ["restaurant", "cafe", "food"],
    "Real Estate": ["realty", "realtor", "property"],
    "E-commerce": ["shop", "store", "ecommerce"],
  };
  return aliases[category] ?? [];
}

function categoryQueryVariants(category: string, location: string, negative: string) {
  const variants: Record<string, string[]> = {
    Healthcare: [
      "clinic",
      "medical clinic",
      "family clinic",
      "primary care",
      "urgent care",
      "pediatric clinic",
      "internal medicine",
      "specialty clinic",
      "wellness clinic",
      "doctor office",
      "medical practice",
      "health center",
    ],
    Dental: ["dentist", "dental clinic", "orthodontist", "cosmetic dentist", "family dentist", "dental office"],
    Fitness: ["gym", "fitness studio", "personal training", "pilates studio", "yoga studio"],
    Restaurants: ["restaurant", "cafe", "bistro", "grill", "catering"],
    "Real Estate": ["real estate agency", "realtor", "property management", "realty group"],
    "Home Services": ["plumber", "HVAC", "electrician", "roofing", "cleaning service", "landscaping"],
    "E-commerce": ["online store", "shop", "ecommerce brand", "boutique"],
    SaaS: ["software company", "SaaS company", "technology company", "app development"],
  };

  return (variants[category] ?? [category]).flatMap((term) => [
    `${term} ${location} website contact ${negative}`,
    `${term} ${location} email phone ${negative}`,
  ]);
}

function isLowQualityResult(result: SearchResult) {
  const text = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const badTerms = [
    "top ",
    "best ",
    "list of",
    "directory",
    "database",
    "email list",
    "email & phone",
    "phone number",
    "funded",
    "investors",
    "jobs",
    "salary",
    "course",
    "template",
    "examples",
    "market size",
    "statistics",
    "blog/",
    "/blog",
    "article",
    "/auth/",
    "/login",
    "/register",
    "profile",
  ];

  return badTerms.some((term) => text.includes(term));
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeUrl(value: string) {
  if (!value.trim()) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProtocol).toString();
  } catch {
    return "";
  }
}

function hostnameToName(url: string) {
  return getDomain(url).split(".")[0]?.replace(/[-_]/g, " ") || "Target Website";
}

function cleanBusinessName(value: string) {
  return decodeHtml(value)
    .replace(/\s[-|].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractMatch(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1] || match?.[2] || "";
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
