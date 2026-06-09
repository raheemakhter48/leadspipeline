import { NextResponse } from "next/server";
import { messageSmtpConfigured } from "@/lib/email";

const DEFAULT_BACKEND_URL = "https://raheemakhter-leadspipeline.hf.space";

export async function GET() {
  if (messageSmtpConfigured()) {
    return NextResponse.json({ configured: true });
  }

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json({ configured: false });
  }

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/mail/status`, { cache: "no-store" });
    const payload = await response.json();
    return NextResponse.json({ configured: Boolean(payload.configured) });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
