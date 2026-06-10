import { NextResponse } from "next/server";

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
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Test email failed." }, { status: 502 });
  }
}
