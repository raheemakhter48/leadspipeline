import { NextResponse } from "next/server";
import { searchOpenMapLeads } from "@/lib/open-map-scraper";
import { searchPublicWebLeads } from "@/lib/web-leads";
import type { Lead } from "@/lib/types";

type ReadySearchBody = {
  category: string;
  city: string;
  country: string;
  decisionMaker: boolean;
  directDial: boolean;
  emailVerified: boolean;
  excludedLeadIds?: string[];
  fetchContacts: boolean;
  includeWebResults: boolean;
  max: number;
  service: string;
  stage: string;
  state: string;
  targetWebsite: string;
};

const DEFAULT_BACKEND_URL = "http://92.4.71.166:7860";

export async function POST(request: Request) {
  const body = (await request.json()) as ReadySearchBody;
  const backendUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");

  try {
    const response = await fetch(`${backendUrl}/leads/ready-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return NextResponse.json(payload);
  } catch {
    // Fallback below keeps local development usable if the Oracle scraper is offline.
  }

  const leads = await localFallbackSearch(body);
  return NextResponse.json({
    leads,
    mode: "local_free_scraper_fallback",
    warning: leads.length ? `${leads.length} leads found with local fallback scraper.` : "No real leads found from local fallback scraper.",
  });
}

async function localFallbackSearch(body: ReadySearchBody) {
  const max = Math.min(Math.max(Number(body.max) || 50, 1), 500);
  const location = [body.city !== "All Cities" ? body.city : "", body.state !== "All Regions" ? body.state : "", body.country]
    .filter(Boolean)
    .join(", ");
  const settled = await Promise.allSettled([
    withTimeout(searchPublicWebLeads({ ...body, max }), 28000),
    withTimeout(
      searchOpenMapLeads({
        category: String(body.category ?? ""),
        keyword: String(body.service ?? ""),
        limit: max,
        location,
      }),
      10000,
    ),
  ]);

  const leads = dedupeLeads(settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []))).filter((lead) => {
    if (body.excludedLeadIds?.includes(lead.id)) return false;
    if (body.emailVerified && !lead.email) return false;
    if (body.directDial && !lead.phone) return false;
    return true;
  });

  return leads.slice(0, max);
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), ms);
    }),
  ]);
}

function dedupeLeads(leads: Lead[]) {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = (lead.website || lead.email || lead.googleMapsUrl || `${lead.businessName}-${lead.address}`).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
