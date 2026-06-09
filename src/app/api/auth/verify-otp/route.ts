import { NextResponse } from "next/server";
import { verifyLoginOtp } from "@/lib/auth-db";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string; email?: string };

  if (!body.email?.trim() || !body.code?.trim()) {
    return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
  }

  try {
    const user = await verifyLoginOtp({ code: body.code, email: body.email });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OTP verification failed." }, { status: 401 });
  }
}
