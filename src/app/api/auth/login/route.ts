import { NextResponse } from "next/server";
import { loginEmailUser } from "@/lib/auth-db";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const user = await loginEmailUser({ email: body.email, password: body.password });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 401 });
  }
}
