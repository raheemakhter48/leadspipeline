import { NextResponse } from "next/server";
import { createCampaignInDb, getCampaigns } from "@/lib/db";
import type { Campaign } from "@/lib/types";

export async function GET() {
  const campaigns = await getCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Pick<Campaign, "name" | "subject" | "template">;
  const campaign = await createCampaignInDb(body);
  return NextResponse.json({ campaign }, { status: 201 });
}
