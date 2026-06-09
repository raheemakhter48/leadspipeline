import { NextResponse } from "next/server";
import type { Lead } from "@/lib/types";

type Enrichment = {
  leadId: string;
  company: string;
  likelyDecisionMakers: string[];
  linkedinSearchUrl: string;
  companyEmailPatterns: string[];
  outreachAngle: string;
  confidence: "high" | "medium" | "low";
};

export async function POST(request: Request) {
  const body = (await request.json()) as { leads?: Lead[]; service?: string };
  const leads = (body.leads ?? []).slice(0, 10);

  if (leads.length === 0) {
    return NextResponse.json({ enrichments: [] });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      enrichments: leads.map((lead) => localEnrichment(lead, body.service ?? "lead generation")),
      mode: "local",
      warning: "GROQ_API_KEY is not configured. Using local enrichment suggestions.",
    });
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return strict JSON only. Enrich B2B leads. Do not claim emails are verified unless supplied. Do not scrape private data. Provide LinkedIn search URLs, likely roles, outreach angle, and unverified company email patterns from public company domain only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            service: body.service ?? "lead generation",
            leads: leads.map((lead) => ({
              id: lead.id,
              company: lead.businessName,
              category: lead.category,
              website: lead.website,
              location: lead.location,
            })),
            requiredShape: {
              enrichments: [
                {
                  leadId: "string",
                  company: "string",
                  likelyDecisionMakers: ["Owner", "Founder", "Marketing Manager"],
                  linkedinSearchUrl: "string",
                  companyEmailPatterns: ["info@domain.com"],
                  outreachAngle: "string",
                  confidence: "high|medium|low",
                },
              ],
            },
          }),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json(
      {
        enrichments: leads.map((lead) => localEnrichment(lead, body.service ?? "lead generation")),
        mode: "local",
        warning: `Groq enrichment failed: ${response.status} ${message.slice(0, 160)}`,
      },
      { status: 200 },
    );
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? "{}";

  try {
    return NextResponse.json({ ...JSON.parse(content), mode: "groq" });
  } catch {
    return NextResponse.json({
      enrichments: leads.map((lead) => localEnrichment(lead, body.service ?? "lead generation")),
      mode: "local",
      warning: "Groq returned non-JSON content. Used local enrichment suggestions.",
    });
  }
}

function localEnrichment(lead: Lead, service: string): Enrichment {
  const domain = extractDomain(lead.website);
  const companyQuery = encodeURIComponent(`${lead.businessName} ${lead.location} LinkedIn owner founder`);

  return {
    leadId: lead.id,
    company: lead.businessName,
    likelyDecisionMakers: ["Owner", "Founder", "Marketing Manager"],
    linkedinSearchUrl: `https://www.linkedin.com/search/results/all/?keywords=${companyQuery}`,
    companyEmailPatterns: domain ? [`info@${domain}`, `hello@${domain}`, `contact@${domain}`] : [],
    outreachAngle: `Pitch ${service} around more qualified local leads for ${lead.businessName}.`,
    confidence: domain ? "medium" : "low",
  };
}

function extractDomain(website: string) {
  try {
    if (!website) return "";
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
