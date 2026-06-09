import { scoreLead } from "@/lib/scoring";
import type { Lead, LeadSearchRequest } from "@/lib/types";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
].join(",");

export async function searchGoogleMapsLeads(input: LeadSearchRequest): Promise<Lead[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured.");

  const textQuery = [input.keyword, input.category, "in", input.location].filter(Boolean).join(" ");

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      pageSize: Math.min(Math.max(input.limit ?? 20, 1), 20),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places request failed: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };
  return (payload.places ?? []).map((place) => toLead(place, input));
}

function toLead(place: GooglePlace, input: LeadSearchRequest): Lead {
  const rating = place.rating ?? 0;
  const reviewCount = place.userRatingCount ?? 0;
  const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
  const website = place.websiteUri ?? "";
  const { aiScore, temperature } = scoreLead({ rating, reviewCount, phone, website });

  return {
    id: place.id ?? crypto.randomUUID(),
    businessName: place.displayName?.text ?? "Unknown business",
    category: place.primaryTypeDisplayName?.text ?? input.category,
    address: place.formattedAddress ?? "",
    phone,
    website,
    googleMapsUrl: place.googleMapsUri ?? "",
    rating,
    reviewCount,
    location: input.location,
    country: input.location.split(",").at(-1)?.trim() || input.location,
    source: "google_maps",
    aiScore,
    temperature,
    status: "new",
    createdAt: new Date().toISOString(),
  };
}
