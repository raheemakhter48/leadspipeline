export type TabId =
  | "dashboard"
  | "ready"
  | "google"
  | "ai"
  | "campaigns"
  | "contacts"
  | "messages"
  | "settings";

export type LeadEnrichment = {
  leadId: string;
  company: string;
  likelyDecisionMakers: string[];
  linkedinSearchUrl: string;
  companyEmailPatterns: string[];
  outreachAngle: string;
  confidence: "high" | "medium" | "low";
};

export type Stat = {
  label: string;
  value: string;
  detail: string;
};

export type QuickSearch = {
  category: string;
  city: string;
  country: string;
  keyword: string;
  service: string;
  stage: string;
  state: string;
};

export type ReadyHistoryItem = {
  id: string;
  text: string;
};

export type HunterEnrichment = {
  leadId: string;
  company: string;
  domain: string;
  warning?: string;
  emails: {
    value: string;
    type: string;
    confidence: number;
    name: string;
    position: string;
    phone: string;
    linkedin: string;
  }[];
};
