import { NextResponse } from "next/server";
import { createLoginOtp } from "@/lib/auth-db";
import { sendOtpEmail, smtpConfigured } from "@/lib/email";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const otp = await createLoginOtp(body.email);
  await sendOtpEmail({ code: otp.code, to: otp.email });

  return NextResponse.json({
    devCode: smtpConfigured() ? undefined : otp.code,
    message: smtpConfigured() ? "OTP sent to your email." : "SMTP is not configured. Use devCode for local testing.",
    sent: smtpConfigured(),
  });
}
