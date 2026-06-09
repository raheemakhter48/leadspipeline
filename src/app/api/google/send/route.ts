import { NextResponse } from "next/server";
import { messageSmtpConfigured, sendOutboundEmail } from "@/lib/email";

const DEFAULT_BACKEND_URL = "https://raheemakhter-leadspipeline.hf.space";

export async function POST(request: Request) {
  const body = (await request.json()) as { body?: string; subject?: string; to?: string };

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "To, subject, and body are required." }, { status: 400 });
  }

  const payload = {
    body: body.body,
    subject: body.subject,
    to: body.to,
  };

  if (!messageSmtpConfigured()) {
    return proxyToBackend(payload);
  }

  try {
    const result = await sendOutboundEmail(payload);

    if (!result.sent) {
      return NextResponse.json({ error: result.error ?? "Email send failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function proxyToBackend(body: { body: string; subject: string; to: string }) {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ error: "Message SMTP is not configured and BACKEND_URL is missing." }, { status: 500 });
  }

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/mail/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: payload.detail ?? payload.error ?? "Backend email send failed." }, { status: response.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend email send failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
