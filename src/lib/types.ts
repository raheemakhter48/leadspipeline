export type LeadTemperature = "Hot" | "Warm" | "Cold";

export type Lead = {
  id: string;
  businessName: string;
  category: string;
  address: string;
  phone: string;
  email?: string;
  website: string;
  socialLinks?: string[];
  googleMapsUrl: string;
  rating: number;
  reviewCount: number;
  location: string;
  country: string;
  source: "google_maps" | "open_maps" | "web_search";
  aiScore: number;
  temperature: LeadTemperature;
  status: "new" | "saved" | "queued" | "contacted";
  createdAt: string;
};

export type LeadSearchRequest = {
  category: string;
  location: string;
  keyword?: string;
  limit?: number;
};

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  template: string;
  status: "draft" | "scheduled" | "running" | "paused";
  leadCount: number;
  opens: number;
  clicks: number;
  bounces: number;
  createdAt: string;
};
