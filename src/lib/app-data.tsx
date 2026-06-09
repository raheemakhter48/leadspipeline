import { BarChart3, Mail, MapPin, MessageSquare, Settings, Star, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { QuickSearch, TabId } from "@/lib/app-types";

export const navItems: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { id: "ready", label: "Ready To Buy", Icon: Zap },
  { id: "google", label: "Google Maps", Icon: MapPin },
  { id: "ai", label: "AI Intel", Icon: Star },
  { id: "campaigns", label: "Campaigns", Icon: Mail },
  { id: "contacts", label: "Contacts", Icon: Users },
  { id: "messages", label: "Messages", Icon: MessageSquare },
  { id: "settings", label: "Settings", Icon: Settings },
];

export const quickSearches: QuickSearch[] = [
  {
    category: "Software Companies",
    city: "All Cities",
    country: "Pakistan",
    keyword: "mobile app companies with email and social links",
    service: "Mobile App Development",
    stage: "Startup",
    state: "All Regions",
  },
  {
    category: "Healthcare",
    city: "All Cities",
    country: "United States",
    keyword: "online pharmacy and healthcare ecommerce websites",
    service: "E-commerce Development",
    stage: "Growth Stage",
    state: "All Regions",
  },
  {
    category: "Dental",
    city: "Austin",
    country: "United States",
    keyword: "dentist clinics needing local SEO",
    service: "Local SEO",
    stage: "Established",
    state: "Texas",
  },
];

export const titleMap: Record<TabId, string> = {
  dashboard: "LeadsPipeline dashboard",
  ready: "Ready-to-buy leads",
  google: "Find local business leads",
  ai: "AI company intel",
  campaigns: "Email campaigns",
  contacts: "Saved contacts",
  messages: "Messages",
  settings: "Settings",
};
