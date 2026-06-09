import type { Campaign, Lead } from "@/lib/types";

const globalStore = globalThis as typeof globalThis & {
  leadEngineStore?: {
    googleConnection?: {
      accessToken: string;
      email: string;
      expiresAt: number;
      refreshToken?: string;
    };
    leads: Lead[];
    campaigns: Campaign[];
  };
};

export const store =
  globalStore.leadEngineStore ??
  (globalStore.leadEngineStore = {
    leads: [],
    campaigns: [],
  });

export function saveLeads(incoming: Lead[]) {
  const existingIds = new Set(store.leads.map((lead) => lead.id));
  const newLeads = incoming
    .filter((lead) => !existingIds.has(lead.id))
    .map((lead) => ({ ...lead, status: "saved" as const }));

  store.leads = [...newLeads, ...store.leads];
  return newLeads;
}

export function createCampaign(input: Pick<Campaign, "name" | "subject" | "template">) {
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    name: input.name,
    subject: input.subject,
    template: input.template,
    status: "draft",
    leadCount: store.leads.length,
    opens: 0,
    clicks: 0,
    bounces: 0,
    createdAt: new Date().toISOString(),
  };

  store.campaigns = [campaign, ...store.campaigns];
  return campaign;
}
