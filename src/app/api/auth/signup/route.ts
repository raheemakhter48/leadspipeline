import { NextResponse } from "next/server";
import { createEmailUser } from "@/lib/auth-db";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; name?: string; password?: string };

  if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
    return NextResponse.json({ error: "Name, email, and 8+ character password are required." }, { status: 400 });
  }

  try {
    const user = await createEmailUser({ email: body.email, name: body.name, password: body.password });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Signup failed." }, { status: 400 });
  }
}
