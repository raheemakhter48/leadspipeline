import { NextResponse } from "next/server";
import { createResetToken } from "@/lib/auth-db";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const token = await createResetToken(body.email);
  return NextResponse.json({
    message: "Password reset request created.",
    resetUrl: `/reset-password?token=${token}`,
  });
}
