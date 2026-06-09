import { Star } from "lucide-react";
import type { Lead } from "@/lib/types";

export function LeadList({
  leads,
  selected = [],
  onToggleLead,
}: {
  leads: Lead[];
  selected?: string[];
  onToggleLead?: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="bg-[#f7f5f0] text-left text-xs uppercase text-[#65605a]">
          <tr>
            {onToggleLead && <th className="w-12 px-4 py-3"></th>}
            <th className="px-4 py-3">Business</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">AI Score</th>
            <th className="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr className="border-t border-black/10" key={lead.id}>
              {onToggleLead && (
                <td className="px-4 py-3">
                  <input
                    aria-label={`Select ${lead.businessName}`}
                    checked={selected.includes(lead.id)}
                    onChange={() => onToggleLead(lead.id)}
                    type="checkbox"
                  />
                </td>
              )}
              <td className="px-4 py-3">
                <p className="font-semibold">{lead.businessName}</p>
                <p className="text-[#65605a]">{lead.category} - {lead.address}</p>
              </td>
              <td className="px-4 py-3">
                <p>{lead.email || "No email"}</p>
                <p className="text-[#65605a]">{lead.phone || "No phone"}</p>
                <a className="text-[#1f6f5b]" href={lead.website || lead.googleMapsUrl || "#"} rel="noreferrer" target="_blank">
                  {lead.website ? "Website" : "Maps profile"}
                </a>
                {lead.socialLinks && lead.socialLinks.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {lead.socialLinks.slice(0, 3).map((link) => (
                      <a className="text-xs text-[#0b5cab]" href={link} key={link} rel="noreferrer" target="_blank">
                        {socialLabel(link)}
                      </a>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <Star size={15} className="fill-[#f5c84b] text-[#b98900]" />
                  {lead.rating || "N/A"} ({lead.reviewCount})
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-md bg-[#101418] px-2 py-1 text-xs font-semibold text-white">
                  {lead.temperature} {lead.aiScore}
                </span>
              </td>
              <td className="px-4 py-3">{lead.source}</td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-[#65605a]" colSpan={onToggleLead ? 6 : 5}>
                Search a category and location to load leads.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function socialLabel(link: string) {
  const value = link.toLowerCase();
  if (value.includes("linkedin.com")) return "LinkedIn";
  if (value.includes("instagram.com")) return "Instagram";
  if (value.includes("facebook.com")) return "Facebook";
  if (value.includes("youtube.com")) return "YouTube";
  if (value.includes("tiktok.com")) return "TikTok";
  if (value.includes("twitter.com") || value.includes("x.com")) return "X";
  return "Social";
}
