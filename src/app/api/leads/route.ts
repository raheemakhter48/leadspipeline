import { NextResponse } from "next/server";
import { getLeads, saveLeadsToDb } from "@/lib/db";
import { saveLeads, store } from "@/lib/store";
import type { Lead } from "@/lib/types";

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[leads] database unavailable, using memory store", error);
    return NextResponse.json({ leads: store.leads, warning: "Database unavailable. Using temporary memory store." });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { leads?: Lead[] };
  const incoming = body.leads ?? [];

  try {
    const saved = await saveLeadsToDb(incoming);
    const leads = await getLeads();
    return NextResponse.json({ saved, leads });
  } catch (error) {
    console.error("[leads] database save failed, using memory store", error);
    const savedLeads = saveLeads(incoming);
    return NextResponse.json({
      saved: savedLeads.length,
      leads: store.leads,
      warning: "Database unavailable. Saved leads in temporary memory store.",
    });
  }
}
