import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://92.4.71.166:7860";

export async function POST(request: Request) {
  const body = (await request.json()) as { backendUrl?: string; adminToken?: string };
  const backendUrl = (body.backendUrl || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, "");

  try {
    const response = await fetch(`${backendUrl}/admin/status`, {
      headers: body.adminToken ? { "x-admin-token": body.adminToken } : {},
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backend status request failed." }, { status: 502 });
  }
}
