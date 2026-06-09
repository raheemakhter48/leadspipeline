import { scoreLead } from "@/lib/scoring";
import type { Lead, LeadSearchRequest } from "@/lib/types";

type NominatimPlace = {
  lat: string;
  lon: string;
  display_name: string;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const categoryTagMap: Record<string, string[]> = {
  healthcare: ['["amenity"="clinic"]', '["amenity"="hospital"]', '["amenity"="doctors"]', '["amenity"="pharmacy"]', '["healthcare"]'],
  dentist: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  dental: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  gym: ['["leisure"="fitness_centre"]', '["sport"="fitness"]'],
  fitness: ['["leisure"="fitness_centre"]', '["sport"="fitness"]'],
  restaurant: ['["amenity"="restaurant"]'],
  cafe: ['["amenity"="cafe"]'],
  hospital: ['["amenity"="hospital"]', '["healthcare"="hospital"]'],
  clinic: ['["amenity"="clinic"]', '["healthcare"="clinic"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  hotel: ['["tourism"="hotel"]'],
  agency: ['["office"="company"]', '["office"="advertising_agency"]'],
  plumber: ['["craft"="plumber"]'],
  salon: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
};

export async function searchOpenMapLeads(input: LeadSearchRequest): Promise<Lead[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 500);
  const geo = await geocodeLocation(input.location);
  const tags = getTags(input.category);
  const query = buildOverpassQuery(tags, Number(geo.lat), Number(geo.lon));

  const url = new URL("https://overpass-api.de/api/interpreter");
  url.searchParams.set("data", query);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "LeadEngineAI/0.1 local development",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Free map scraper failed: ${response.status} ${message.slice(0, 240)}`);
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  return (payload.elements ?? [])
    .filter((element) => element.tags?.name)
    .slice(0, limit)
    .map((element) => toLead(element, input));
}

async function geocodeLocation(location: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", location);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LeadEngineAI/0.1 local development",
      Referer: "http://localhost:3000",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Location lookup failed: ${response.status}`);
  }

  const places = (await response.json()) as NominatimPlace[];
  if (!places[0]) {
    throw new Error(`Location not found: ${location}`);
  }

  return places[0];
}

function getTags(category: string) {
  const normalized = category.toLowerCase();
  const matchedKey = Object.keys(categoryTagMap).find((key) => normalized.includes(key));
  return matchedKey ? categoryTagMap[matchedKey] : ['["name"]'];
}

function buildOverpassQuery(tags: string[], lat: number, lon: number) {
  const radius = 25000;
  const selectors = tags
    .flatMap((tag) => [`node${tag}(around:${radius},${lat},${lon});`, `way${tag}(around:${radius},${lat},${lon});`, `relation${tag}(around:${radius},${lat},${lon});`])
    .join("\n");

  return `
    [out:json][timeout:25];
    (
      ${selectors}
    );
    out center;
  `;
}

function toLead(element: OverpassElement, input: LeadSearchRequest): Lead {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const website = tags.website || tags["contact:website"] || "";
  const phone = tags.phone || tags["contact:phone"] || "";
  const { aiScore, temperature } = scoreLead({ rating: 0, reviewCount: 0, website, phone });

  return {
    id: `open-map-${element.id}`,
    businessName: tags.name || "Unknown business",
    category: tags.amenity || tags.shop || tags.office || tags.craft || input.category,
    address: formatAddress(tags),
    phone,
    website,
    googleMapsUrl: lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : "",
    rating: 0,
    reviewCount: 0,
    location: input.location,
    country: input.location.split(",").at(-1)?.trim() || input.location,
    source: "open_maps",
    aiScore,
    temperature,
    status: "new",
    createdAt: new Date().toISOString(),
  };
}

function formatAddress(tags: Record<string, string>) {
  return [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ]
    .filter(Boolean)
    .join(", ");
}
