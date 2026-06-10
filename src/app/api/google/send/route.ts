import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://92.4.71.166:7860";

export async function POST(request: Request) {
  const body = (await request.json()) as { body?: string; html?: string; subject?: string; to?: string };

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "To, subject, and body are required." }, { status: 400 });
  }

  const payload = {
    body: body.body,
    html: body.html,
    subject: body.subject,
    to: body.to,
  };

  return proxyToBackend(payload);
}

async function proxyToBackend(body: { body: string; html?: string; subject: string; to: string }) {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ error: "Message SMTP is not configured and BACKEND_URL is missing." }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/mail/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: payload.detail ?? payload.error ?? "Backend email send failed." }, { status: response.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Backend email send timed out." : error instanceof Error ? error.message : "Backend email send failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
