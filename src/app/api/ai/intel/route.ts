import { NextResponse } from "next/server";

type AiIntelRequest = {
  company?: string;
  prompt?: string;
  website?: string;
};

type AiIntelResponse = {
  body: string;
  companyIntel: string[];
  outreachAngles: string[];
  subject: string;
  warning?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AiIntelRequest;
  const company = body.company?.trim() || "the company";
  const prompt = body.prompt?.trim() || "Find useful company intel and write a short B2B outreach email.";
  const website = normalizeUrl(body.website ?? "");
  const websiteContext = website ? await scrapeWebsiteText(website) : "";

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      ...localIntel(company, website, prompt, websiteContext),
      warning: "GROQ_API_KEY is not configured. Used local AI fallback.",
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
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return strict JSON only. Create concise B2B company intel and an outreach email. Use only provided website text and user prompt. Do not invent private facts, revenue, employees, or decision makers. Keep placeholders when useful: {{name}}, {{company}}, {{website}}, {{category}}, {{email}}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            company,
            prompt,
            website,
            websiteText: websiteContext,
            requiredShape: {
              companyIntel: ["string"],
              outreachAngles: ["string"],
              subject: "string",
              body: "string",
            },
          }),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({
      ...localIntel(company, website, prompt, websiteContext),
      warning: "Groq request failed. Used local AI fallback.",
    });
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content) as Partial<AiIntelResponse>;
    return NextResponse.json({
      body: parsed.body || localIntel(company, website, prompt, websiteContext).body,
      companyIntel: normalizeList(parsed.companyIntel),
      outreachAngles: normalizeList(parsed.outreachAngles),
      subject: parsed.subject || `Quick idea for ${company}`,
    });
  } catch {
    return NextResponse.json({
      ...localIntel(company, website, prompt, websiteContext),
      warning: "AI returned invalid JSON. Used local AI fallback.",
    });
  }
}

async function scrapeWebsiteText(website: string) {
  try {
    const response = await fetch(website, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadsPipeline/0.1)" },
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return "";
    const html = await response.text();
    return stripHtml(html).slice(0, 4500);
  } catch {
    return "";
  }
}

function localIntel(company: string, website: string, prompt: string, websiteContext: string): AiIntelResponse {
  const source = websiteContext ? "website content" : "your prompt";
  return {
    companyIntel: [
      `${company} context is based on ${source}.`,
      website ? `Website reviewed: ${website}` : "No website was provided.",
      "Use a practical, low-pressure outreach angle instead of broad claims.",
    ],
    outreachAngles: [
      "Offer a quick audit or growth idea.",
      "Reference their current website or category.",
      "Keep the first email short and easy to reply to.",
    ],
    subject: `Quick idea for ${company}`,
    body: `Hi {{name}},

I reviewed ${website || "{{website}}"} and noticed a few places where {{company}} could make the customer journey clearer.

One practical angle is: ${prompt}

If useful, I can send a short breakdown with 2-3 improvements for {{company}}.

Best,
{{email}}`,
  };
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean).slice(0, 6);
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

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
