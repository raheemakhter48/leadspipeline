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

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as ReadySearchBody;
  const backendUrl = normalizeBackendUrl(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL);
  let backendError = "";

  try {
    const response = await fetchReadyBackend(backendUrl, body);
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      if ((payload.leads?.length ?? 0) === 0 && (body.excludedLeadIds?.length ?? 0) > 0) {
        const retryResponse = await fetchReadyBackend(backendUrl, { ...body, excludedLeadIds: [] });
        const retryPayload = await retryResponse.json().catch(() => ({}));
        if (retryResponse.ok && (retryPayload.leads?.length ?? 0) > 0) {
          return NextResponse.json({
            ...retryPayload,
            warning: retryPayload.warning || "Showing previously seen email-ready leads for this search.",
          });
        }
      }
      return NextResponse.json(payload);
    }
    backendError = `Oracle backend returned ${response.status}.`;
  } catch (error) {
    backendError = error instanceof Error ? error.message : "Oracle backend request failed.";
    // Fallback below keeps local development usable if the Oracle scraper is offline.
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        backendUrlConfigured: Boolean(backendUrl),
        backendUrlHost: safeHost(backendUrl),
        error: backendError || "Oracle backend request failed.",
        leads: [],
        mode: "oracle_backend_unavailable",
      },
      { status: 502 },
    );
  }

  const leads = await localFallbackSearch(body);
  return NextResponse.json({
    leads,
    mode: "local_free_scraper_fallback",
    warning: leads.length
      ? `${leads.length} leads found with local fallback scraper. ${backendError}`
      : `No real leads found from local fallback scraper. ${backendError}`,
  });
}

function fetchReadyBackend(backendUrl: string, body: ReadySearchBody) {
  return fetch(`${backendUrl}/leads/ready-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(55000),
  });
}

function normalizeBackendUrl(value: string) {
  const cleaned = value
    .trim()
    .replace(/^BACKEND_URL=/, "")
    .replace(/^NEXT_PUBLIC_BACKEND_URL=/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");

  if (!cleaned) return DEFAULT_BACKEND_URL;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `http://${cleaned}`;
}

function safeHost(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "invalid-url";
  }
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
    if (!lead.email) return false;
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
