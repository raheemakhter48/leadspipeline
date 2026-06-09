import { NextResponse } from "next/server";
import { messageSmtpConfigured } from "@/lib/email";

export function GET() {
  return NextResponse.json({ configured: messageSmtpConfigured() });
}
