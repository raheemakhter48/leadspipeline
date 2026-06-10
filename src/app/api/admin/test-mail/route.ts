import { NextResponse } from "next/server";
import { saveMailLogToDb } from "@/lib/db";
import { saveMailLog } from "@/lib/store";

const DEFAULT_BACKEND_URL = "http://92.4.71.166:7860";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    adminToken?: string;
    backendUrl?: string;
    body?: string;
    subject?: string;
    to?: string;
  };
  const backendUrl = (body.backendUrl || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");

  try {
    const response = await fetch(`${backendUrl}/admin/test-mail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(body.adminToken ? { "x-admin-token": body.adminToken } : {}),
      },
      body: JSON.stringify({
        body: body.body,
        subject: body.subject,
        to: body.to,
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    const ok = response.ok;
    await recordMailLog({
      backendResponse: JSON.stringify(payload),
      body: body.body || "",
      errorMessage: ok ? "" : payload.detail ?? payload.error ?? "Test email failed.",
      recipientEmail: body.to || "",
      sentAt: ok ? new Date().toISOString() : undefined,
      status: ok ? "sent" : "failed",
      subject: body.subject || "",
      userEmail: "admin",
    });
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test email failed.";
    await recordMailLog({
      backendResponse: "",
      body: body.body || "",
      errorMessage: message,
      recipientEmail: body.to || "",
      status: "failed",
      subject: body.subject || "",
      userEmail: "admin",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
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
    console.error("[admin] test mail database log failed, using memory store", error);
    saveMailLog(input);
  }
}
