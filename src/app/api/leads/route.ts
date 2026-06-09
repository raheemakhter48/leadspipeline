import { NextResponse } from "next/server";
import { getLeads, saveLeadsToDb } from "@/lib/db";
import type { Lead } from "@/lib/types";

export async function GET() {
  const leads = await getLeads();
  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { leads?: Lead[] };
  const saved = await saveLeadsToDb(body.leads ?? []);
  const leads = await getLeads();
  return NextResponse.json({ saved, leads });
}
