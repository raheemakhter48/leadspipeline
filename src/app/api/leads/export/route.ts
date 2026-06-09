import { getLeads } from "@/lib/db";

export async function GET() {
  const leads = await getLeads();
  const rows = [
    ["Business Name", "Category", "Address", "Email", "Phone", "Website", "Google Maps URL", "Rating", "Reviews", "Location", "Source", "AI Score", "Temperature", "Status", "Created At"],
    ...leads.map((lead) => [
      lead.businessName,
      lead.category,
      lead.address,
      lead.email ?? "",
      lead.phone,
      lead.website,
      lead.googleMapsUrl,
      String(lead.rating),
      String(lead.reviewCount),
      lead.location,
      lead.source,
      String(lead.aiScore),
      lead.temperature,
      lead.status,
      lead.createdAt,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=google-maps-leads.csv",
    },
  });
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
