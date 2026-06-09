import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { body?: string; instruction?: string; subject?: string };

  if (!body.body || !body.subject || !body.instruction) {
    return NextResponse.json({ error: "Subject, body, and AI instruction are required." }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      body: localTailor(body.body, body.instruction),
      subject: body.subject,
      warning: "GROQ_API_KEY is not configured. Used local tailoring.",
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
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return strict JSON only with subject and body. Rewrite B2B outreach emails. Keep placeholders exactly when useful: {{name}}, {{company}}, {{website}}, {{category}}, {{email}}. Do not invent private data.",
        },
        {
          role: "user",
          content: JSON.stringify({
            current: { body: body.body, subject: body.subject },
            instruction: body.instruction,
            requiredShape: { subject: "string", body: "string" },
          }),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({
      body: localTailor(body.body, body.instruction),
      subject: body.subject,
      warning: "AI tailoring failed. Used local tailoring.",
    });
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content) as { body?: string; subject?: string };
    return NextResponse.json({ body: parsed.body ?? body.body, subject: parsed.subject ?? body.subject });
  } catch {
    return NextResponse.json({
      body: localTailor(body.body, body.instruction),
      subject: body.subject,
      warning: "AI returned invalid JSON. Used local tailoring.",
    });
  }
}

function localTailor(message: string, instruction: string) {
  const lower = instruction.toLowerCase();
  if (lower.includes("short")) {
    return message.split(".").filter(Boolean).slice(0, 2).join(". ").trim() + ".";
  }
  if (lower.includes("warm")) {
    return `${message}\n\nHappy to send a quick, no-pressure breakdown if it helps.`;
  }
  if (lower.includes("formal")) {
    return message.replace("Hi ", "Hello ").replace("I can help", "I would like to help");
  }
  return `${message}\n\nContext: ${instruction}`;
}
