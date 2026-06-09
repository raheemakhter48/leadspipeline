import { NextResponse } from "next/server";
import { sendOutboundEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = (await request.json()) as { body?: string; subject?: string; to?: string };

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: "To, subject, and body are required." }, { status: 400 });
  }

  try {
    const result = await sendOutboundEmail({
      body: body.body,
      subject: body.subject,
      to: body.to,
    });

    if (!result.sent) {
      return NextResponse.json({ error: result.error ?? "Email send failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
