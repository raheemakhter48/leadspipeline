import { NextResponse } from "next/server";
import { searchGoogleMapsLeads } from "@/lib/google-maps";
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
  fetchContacts: boolean;
  includeWebResults: boolean;
  max: number;
  service: string;
  stage: string;
  state: string;
  targetWebsite: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ReadySearchBody;
  const max = Math.min(Math.max(Number(body.max) || 50, 1), 500);
  const location = [body.city !== "All Cities" ? body.city : "", body.state !== "All Regions" ? body.state : "", body.country]
    .filter(Boolean)
    .join(", ");

  const settled = await Promise.allSettled([
    withTimeout(searchPublicWebLeads({ ...body, max }), 28000, "Web scraper timed out."),
    withTimeout(searchOpenMapLeads({
      category: String(body.category ?? ""),
      keyword: String(body.service ?? ""),
      limit: max,
      location,
    }), 10000, "Open map source timed out."),
    withTimeout(searchGoogleMapsLeads({
      category: String(body.category ?? ""),
      keyword: String(body.service ?? ""),
      limit: max,
      location,
    }), 7000, "Google Maps source timed out."),
  ]);

  const initialLeads = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const leads = await fillRequestedCount(body, max, initialLeads);

  const errors = settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => (result.reason instanceof Error ? result.reason.message : "Provider failed"));

  return NextResponse.json({
    leads,
    mode: "real_sources",
    warning: buildWarning(leads.length, max, errors),
  });
}

async function fillRequestedCount(body: ReadySearchBody, max: number, initialLeads: Lead[]) {
  const leads = filterRequestedLeads(dedupeLeads(initialLeads), body);
  const attempts = buildFallbackSearches(body, max);

  for (const attempt of attempts) {
    if (leads.length >= max) break;
    const remaining = max - leads.length;
    const extra = await withTimeout(
      searchPublicWebLeads({ ...body, ...attempt, max: Math.min(Math.max(remaining * 3, 30), 500) }),
      30000,
      "Extra web scraper pass timed out.",
    ).catch(() => []);

    leads.push(...filterRequestedLeads(dedupeLeads([...leads, ...extra]), body).filter((lead) => !leads.some((item) => leadKey(item) === leadKey(lead))));
  }

  return leads.slice(0, max);
}

function buildFallbackSearches(body: ReadySearchBody, max: number) {
  const attempts: Partial<ReadySearchBody>[] = [];

  if (body.city !== "All Cities") attempts.push({ city: "All Cities", max });
  if (body.state !== "All Regions") attempts.push({ city: "All Cities", state: "All Regions", max });
  attempts.push({ city: "All Cities", state: "All Regions", targetWebsite: "", max });

  return attempts;
}

function filterRequestedLeads(leads: Lead[], body: ReadySearchBody) {
  return leads.filter((lead) => {
    if (body.emailVerified && !lead.email) return false;
    if (body.directDial && !lead.phone) return false;
    return true;
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function dedupeLeads(leads: Lead[]) {
  const seen = new Set<string>();

  return leads.filter((lead) => {
    const key = leadKey(lead);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function leadKey(lead: Lead) {
  return (lead.website || lead.email || lead.googleMapsUrl || `${lead.businessName}-${lead.address}`).toLowerCase();
}

function buildWarning(count: number, max: number, errors: string[]) {
  const parts = [];
  if (count === 0) parts.push("No real leads found for this selection.");
  if (count > 0 && count < max) parts.push(`${count} real leads found. No generated fallback data is included.`);
  if (errors.length > 0) parts.push(`Some real data providers failed: ${errors.join(" | ")}`);
  return parts.join(" ");
}
