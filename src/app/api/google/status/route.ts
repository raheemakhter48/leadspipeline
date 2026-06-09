import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  const connection = store.googleConnection;

  return NextResponse.json({
    connected: Boolean(connection?.accessToken && connection.expiresAt > Date.now()),
    email: connection?.email ?? null,
  });
}
