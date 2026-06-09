import { NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${appUrl}/api/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "Google OAuth not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local.",
      },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    access_type: "offline",
    client_id: clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.send"].join(" "),
    state: crypto.randomUUID(),
  });

  return NextResponse.json({ authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}` });
}
