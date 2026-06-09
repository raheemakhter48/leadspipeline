import type { Lead, LeadTemperature } from "@/lib/types";

export function scoreLead(input: Pick<Lead, "rating" | "reviewCount" | "website" | "phone">): {
  aiScore: number;
  temperature: LeadTemperature;
} {
  const ratingScore = Math.min(35, Math.round((input.rating / 5) * 35));
  const reviewScore = Math.min(35, Math.round(Math.log10(input.reviewCount + 1) * 18));
  const contactScore = (input.website ? 15 : 0) + (input.phone ? 15 : 0);
  const aiScore = Math.max(5, Math.min(100, ratingScore + reviewScore + contactScore));

  if (aiScore >= 78) return { aiScore, temperature: "Hot" };
  if (aiScore >= 52) return { aiScore, temperature: "Warm" };
  return { aiScore, temperature: "Cold" };
}
