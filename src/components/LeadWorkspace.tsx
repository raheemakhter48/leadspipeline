import { Mail, Play, Search } from "lucide-react";
import type { FormEvent } from "react";
import { LeadTable } from "@/components/LeadTable";
import { Field, StatsGrid } from "@/components/ui";
import type { Stat, TabId } from "@/lib/app-types";
import type { Lead } from "@/lib/types";

export function LeadWorkspace(props: {
  activeTab: TabId;
  category: string;
  filteredLeads: Lead[];
  filter: string;
  keyword: string;
  limit: number;
  location: string;
  message: string;
  mode: string;
  selected: string[];
  setCategory: (value: string) => void;
  setFilter: (value: string) => void;
  setKeyword: (value: string) => void;
  setLimit: (value: number) => void;
  setLocation: (value: string) => void;
  stats: Stat[];
  onSearch: (event?: FormEvent<HTMLFormElement>) => void;
  onToggleLead: (id: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,390px)_1fr]">
      <div className="min-w-0 space-y-4">
        <form className="rounded-md border border-black/10 bg-white p-4 shadow-sm" onSubmit={props.onSearch}>
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} />
            <h3 className="font-semibold">{props.activeTab === "ai" ? "AI lead request" : "Lead search"}</h3>
          </div>
          <Field label="Business category" value={props.category} onChange={props.setCategory} placeholder="dentist, plumber, gym" />
          <Field label="City / country / location" value={props.location} onChange={props.setLocation} placeholder="Austin, TX" />
          <Field label="Optional keyword" value={props.keyword} onChange={props.setKeyword} placeholder="emergency, luxury, b2b" />
          <label className="mb-4 block text-sm font-medium">
            Result limit
            <input
              className="mt-1 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]"
              max={20}
              min={1}
              type="number"
              value={props.limit}
              onChange={(event) => props.setLimit(Number(event.target.value))}
            />
          </label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white hover:bg-[#252b31]" type="submit">
            <Play size={16} />
            {props.mode === "loading" ? "Searching..." : "Search Leads"}
          </button>
          <p className="mt-3 text-sm text-[#65605a]">{props.message}</p>
        </form>

        <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Mail size={18} />
            <h3 className="font-semibold">Campaign engine</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="rounded-md bg-[#f4f1ea] p-3">Template variables: {"{{name}}"}, {"{{company}}"}</p>
            <p className="rounded-md bg-[#f4f1ea] p-3">Queue target: Redis + BullMQ workers</p>
            <p className="rounded-md bg-[#f4f1ea] p-3">Providers: SES, SendGrid, Mailgun</p>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <StatsGrid stats={props.stats} />
        <LeadTable
          filter={props.filter}
          leads={props.filteredLeads}
          selected={props.selected}
          setFilter={props.setFilter}
          onToggleLead={props.onToggleLead}
        />
      </div>
    </div>
  );
}
