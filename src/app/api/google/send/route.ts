import { NextResponse } from "next/server";
import { saveMailLogToDb } from "@/lib/db";
import { saveMailLog } from "@/lib/store";

const DEFAULT_BACKEND_URL = "http://92.4.71.166:7860";

export async function POST(request: Request) {
  const body = (await request.json()) as { body?: string; html?: string; subject?: string; to?: string; userEmail?: string };

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "To, subject, and body are required." }, { status: 400 });
  }

  const payload = {
    body: body.body,
    html: body.html,
    subject: body.subject,
    to: body.to,
  };

  return proxyToBackend(payload, body.userEmail || "unknown");
}

async function proxyToBackend(body: { body: string; html?: string; subject: string; to: string }, userEmail: string) {
  const backendUrl = normalizeBackendUrl(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL);

  if (!backendUrl) {
    await recordMailLog({
      backendResponse: "",
      body: body.body,
      errorMessage: "Message SMTP is not configured and BACKEND_URL is missing.",
      recipientEmail: body.to,
      status: "failed",
      subject: body.subject,
      userEmail,
    });
    return NextResponse.json({ error: "Message SMTP is not configured and BACKEND_URL is missing." }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(`${backendUrl}/mail/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = payload.detail ?? payload.error ?? "Backend email send failed.";
      await recordMailLog({
        backendResponse: JSON.stringify(payload),
        body: body.body,
        errorMessage,
        recipientEmail: body.to,
        status: "failed",
        subject: body.subject,
        userEmail,
      });
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    await recordMailLog({
      backendResponse: JSON.stringify(payload),
      body: body.body,
      errorMessage: "",
      recipientEmail: body.to,
      sentAt: new Date().toISOString(),
      status: "sent",
      subject: body.subject,
      userEmail,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Backend email send timed out." : error instanceof Error ? error.message : "Backend email send failed.";
    await recordMailLog({
      backendResponse: "",
      body: body.body,
      errorMessage: message,
      recipientEmail: body.to,
      status: "failed",
      subject: body.subject,
      userEmail,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeBackendUrl(value: string) {
  const cleaned = value
    .trim()
    .replace(/^BACKEND_URL=/, "")
    .replace(/^NEXT_PUBLIC_BACKEND_URL=/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .replace(/\/+$/, "");

  if (!cleaned) return DEFAULT_BACKEND_URL;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `http://${cleaned}`;
}

async function recordMailLog(input: {
  backendResponse: string;
  body: string;
  errorMessage: string;
  recipientEmail: string;
  sentAt?: string;
  status: "sent" | "failed";
  subject: string;
  userEmail: string;
}) {
  try {
    await saveMailLogToDb(input);
  } catch (error) {
    console.error("[mail] database log failed, using memory store", error);
    saveMailLog(input);
  }
}
