import { NextResponse } from "next/server";
import { upsertGoogleUser } from "@/lib/auth-db";
import { store } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${appUrl}/api/google/callback`;

  if (!code) {
    return NextResponse.redirect(new URL("/?google=cancelled", request.url));
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?google=missing_credentials", request.url));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?google=token_error", request.url));
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  const profile = profileResponse.ok ? ((await profileResponse.json()) as { email?: string; name?: string }) : {};

  store.googleConnection = {
    accessToken: tokenPayload.access_token,
    email: profile.email ?? "Google account",
    expiresAt: Date.now() + (tokenPayload.expires_in ?? 3600) * 1000,
    refreshToken: tokenPayload.refresh_token,
  };

  if (profile.email) {
    await upsertGoogleUser({ email: profile.email, name: profile.name });
  }

  return NextResponse.redirect(new URL("/?google=connected", request.url));
}
