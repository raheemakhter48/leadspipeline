import { NextResponse } from "next/server";
import type { Lead } from "@/lib/types";

type HunterEmail = {
  value?: string;
  type?: string;
  confidence?: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  phone_number?: string;
  linkedin?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as { leads?: Lead[] };
  const leads = (body.leads ?? []).slice(0, 10);
  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ enrichments: [], warning: "HUNTER_API_KEY is not configured." });
  }

  const enrichments = await Promise.all(leads.map((lead) => enrichLead(lead, apiKey)));
  return NextResponse.json({ enrichments });
}

async function enrichLead(lead: Lead, apiKey: string) {
  const domain = getDomain(lead.website);
  if (!domain) {
    return { leadId: lead.id, company: lead.businessName, domain: "", emails: [], warning: "No domain found." };
  }

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", "5");

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { leadId: lead.id, company: lead.businessName, domain, emails: [], warning: `Hunter failed: ${response.status}` };
    }

    const payload = (await response.json()) as { data?: { emails?: HunterEmail[] } };
    return {
      leadId: lead.id,
      company: lead.businessName,
      domain,
      emails: (payload.data?.emails ?? []).map((email) => ({
        value: email.value ?? "",
        type: email.type ?? "",
        confidence: email.confidence ?? 0,
        name: [email.first_name, email.last_name].filter(Boolean).join(" "),
        position: email.position ?? "",
        phone: email.phone_number ?? "",
        linkedin: email.linkedin ?? "",
      })),
    };
  } catch {
    return { leadId: lead.id, company: lead.businessName, domain, emails: [], warning: "Hunter request failed." };
  }
}

function getDomain(website: string) {
  try {
    if (!website) return "";
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
