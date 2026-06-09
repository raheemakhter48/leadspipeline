import type { Lead } from "@/lib/types";

export function generateReadyLeads(input: {
  category: string;
  city: string;
  country: string;
  directDial: boolean;
  emailVerified: boolean;
  fetchContacts: boolean;
  includeWebResults: boolean;
  decisionMaker: boolean;
  max: number;
  service: string;
  state: string;
  targetWebsite: string;
}) {
  const count = Math.min(Math.max(input.max, 1), 50);
  const city = input.city === "All Cities" ? "Multiple Cities" : input.city;
  const state = input.state === "All Regions" ? "All Regions" : input.state;
  const categorySlug = input.category.toLowerCase().replace(/\s+/g, "-");
  const serviceSlug = input.service.toLowerCase().replace(/\s+/g, "-");
  const createdAt = Date.now();

  return Array.from({ length: count }, (_, index): Lead => {
    const number = index + 1;
    const contactBoost = input.fetchContacts ? 8 : 0;
    const decisionBoost = input.decisionMaker ? 6 : 0;
    const aiScore = Math.min(98, Math.max(42, 84 - (index % 18) * 3 + contactBoost + decisionBoost));
    const temperature = aiScore >= 78 ? "Hot" : aiScore >= 52 ? "Warm" : "Cold";
    const hasPhone = input.fetchContacts && input.directDial;
    const hasWebsite = input.includeWebResults && (input.targetWebsite.length > 0 || index % 4 !== 0);
    const domain = `${categorySlug}${number}.${input.country.toLowerCase().replace(/\s+/g, "")}.example`;

    return {
      id: `ready-${categorySlug}-${serviceSlug}-${createdAt}-${number}`,
      businessName: `${city} ${input.category} ${input.service} Prospect ${number}`,
      category: input.category,
      address: `${100 + number} Market Street, ${city}, ${state}`,
      phone: hasPhone ? `+1 555 ${String(1000 + number).slice(0, 4)}` : "",
      website: hasWebsite ? input.targetWebsite.replace(/\/$/, "") || `https://${domain}` : "",
      googleMapsUrl: "",
      rating: 0,
      reviewCount: 0,
      location: `${city}, ${state}`,
      country: input.country,
      source: "open_maps",
      aiScore,
      temperature,
      status: "new",
      createdAt: new Date().toISOString(),
    };
  }).filter((lead) => {
    if (input.emailVerified && !lead.website) return false;
    return true;
  });
}
