import { Filter } from "lucide-react";
import { LeadList } from "@/components/LeadList";
import type { Lead } from "@/lib/types";

export function LeadTable({
  filter,
  leads,
  selected,
  setFilter,
  onToggleLead,
}: {
  filter: string;
  leads: Lead[];
  selected: string[];
  setFilter: (value: string) => void;
  onToggleLead: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-black/10 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} />
          <h3 className="font-semibold">Ready-to-buy leads</h3>
        </div>
        <div className="flex gap-2">
          {["all", "Hot", "Warm", "Cold"].map((item) => (
            <button
              className={`h-9 rounded-md border px-3 text-sm font-medium ${
                filter === item ? "border-[#1f6f5b] bg-[#dcebe6] text-[#17483d]" : "border-black/10 bg-white"
              }`}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <LeadList leads={leads} selected={selected} onToggleLead={onToggleLead} />
    </div>
  );
}
