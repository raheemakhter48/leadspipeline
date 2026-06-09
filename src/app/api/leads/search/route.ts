import { NextResponse } from "next/server";
import { searchGoogleMapsLeads } from "@/lib/google-maps";
import { searchOpenMapLeads } from "@/lib/open-map-scraper";
import type { LeadSearchRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as LeadSearchRequest;

  if (!body.category || !body.location) {
    return NextResponse.json({ error: "category and location are required" }, { status: 400 });
  }

  try {
    const leads = await searchGoogleMapsLeads(body);
    return NextResponse.json({ leads, mode: "google_places" });
  } catch (googleError) {
    let scraperWarning = "";

    try {
      const leads = await searchOpenMapLeads(body);
      if (leads.length > 0) {
        return NextResponse.json({
          leads,
          mode: "free_scraper",
          warning: "Using free map data. Ratings/reviews may be unavailable.",
        });
      }
      scraperWarning = "Free scraper returned no matching leads.";
    } catch (scraperError) {
      scraperWarning = scraperError instanceof Error ? scraperError.message : "Free scraper failed.";
      // Fall through to empty result when free sources are unavailable.
    }

    return NextResponse.json({
      leads: [],
      mode: "empty",
      warning: [
        googleError instanceof Error ? googleError.message : "Google Maps search failed.",
        scraperWarning,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
}
