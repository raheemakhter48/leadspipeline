import { Filter, Globe, Loader2, Play, Search, Zap } from "lucide-react";
import type { FormEvent } from "react";
import { LeadList } from "@/components/LeadList";
import { Field, Metric, SelectField, Toggle } from "@/components/ui";
import type { ReadyHistoryItem } from "@/lib/app-types";
import { countryLocations, getCityOptions, getRegionOptions } from "@/lib/locations";
import { categoryOptions, serviceOptions } from "@/lib/ready-options";
import type { Lead } from "@/lib/types";

export function ReadyToBuyWorkspace(props: {
  companyStage: string;
  dailyCount: number;
  decisionMaker: boolean;
  directDial: boolean;
  emailVerified: boolean;
  fetchContacts: boolean;
  filter: string;
  history: ReadyHistoryItem[];
  includeWebResults: boolean;
  leads: Lead[];
  loading: boolean;
  maxReadyLeads: number;
  readyCategory: string;
  readyCity: string;
  readyCountry: string;
  readyService: string;
  readyState: string;
  selected: string[];
  targetWebsite: string;
  setCompanyStage: (value: string) => void;
  setDecisionMaker: (value: boolean) => void;
  setDirectDial: (value: boolean) => void;
  setEmailVerified: (value: boolean) => void;
  setFetchContacts: (value: boolean) => void;
  setFilter: (value: string) => void;
  setIncludeWebResults: (value: boolean) => void;
  setMaxReadyLeads: (value: number) => void;
  setReadyCategory: (value: string) => void;
  setReadyCity: (value: string) => void;
  setReadyCountry: (value: string) => void;
  setReadyService: (value: string) => void;
  setReadyState: (value: string) => void;
  setTargetWebsite: (value: string) => void;
  onSaveReadyLeads: () => void;
  onStart: (event: FormEvent<HTMLFormElement>) => void;
  onToggleLead: (id: string) => void;
}) {
  const countryOptions = Object.keys(countryLocations);
  const regionOptions = getRegionOptions(props.readyCountry);
  const cityOptions = getCityOptions(props.readyCountry, props.readyState);

  return (
    <div className="grid min-h-0 min-w-0 gap-4 xl:h-full xl:grid-cols-[minmax(320px,410px)_1fr] xl:overflow-hidden">
      <div className="min-h-0 min-w-0 space-y-4 xl:overflow-y-auto xl:pr-2">
        <form className="rounded-md border border-black/10 bg-white p-4 shadow-sm" onSubmit={props.onStart}>
          <div className="mb-4 flex items-center gap-2">
            <Zap size={18} />
            <h3 className="font-semibold">Ready to Buy Leads</h3>
          </div>
          <Field label="Target Websites (Optional)" value={props.targetWebsite} onChange={props.setTargetWebsite} placeholder="https://example.com" />
          <SelectField label="Filter by Service *" value={props.readyService} onChange={props.setReadyService} options={serviceOptions} />
          <SelectField label="Company Stage/Maturity *" value={props.companyStage} onChange={props.setCompanyStage} options={["Startup", "Growth Stage", "Established", "Enterprise", "Recently Funded"]} />
          <SelectField label="Category*" value={props.readyCategory} onChange={props.setReadyCategory} options={categoryOptions} help="Select a business category." />
          <SelectField label="Country*" value={props.readyCountry} onChange={props.setReadyCountry} options={countryOptions} />
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="State / Region" value={props.readyState} onChange={props.setReadyState} options={regionOptions} />
            <SelectField label="City" value={props.readyCity} onChange={props.setReadyCity} options={cityOptions} />
          </div>
          <label className="mb-3 block text-sm font-medium">
            Max Leads*
            <input className="mt-1 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]" max={500} min={1} type="number" value={props.maxReadyLeads} onChange={(event) => props.setMaxReadyLeads(Number(event.target.value))} />
          </label>
          <p className="mb-3 rounded-md bg-[#f4f1ea] p-3 text-sm font-medium">Daily Unique Leads: {props.dailyCount} leads</p>
          <div className="mb-4 grid gap-2 text-sm">
            <Toggle label="Email Verified" checked={props.emailVerified} onChange={props.setEmailVerified} />
            <Toggle label="Direct Dial Phone" checked={props.directDial} onChange={props.setDirectDial} />
            <Toggle label="Decision Maker Email" checked={props.decisionMaker} onChange={props.setDecisionMaker} />
          </div>
          <div className="mb-4 rounded-md border border-black/10 p-3">
            <p className="mb-2 text-sm font-semibold">Fetching Options</p>
            <div className="grid gap-2 text-sm">
              <Toggle label="Include Web Results" checked={props.includeWebResults} onChange={props.setIncludeWebResults} />
              <Toggle label="Fetch Contacts" checked={props.fetchContacts} onChange={props.setFetchContacts} />
            </div>
          </div>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white hover:bg-[#252b31]" type="submit">
            {props.loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {props.loading ? "Loading leads..." : "Start Engine"}
          </button>
          <button
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-black/15 bg-white font-medium disabled:opacity-50"
            disabled={props.loading || props.selected.length === 0}
            onClick={props.onSaveReadyLeads}
            type="button"
          >
            Save ready leads
          </button>
          <p className="mt-3 text-sm text-[#65605a]">Start Engine fetches websites, email, phone, and social handles.</p>
        </form>
        <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Search size={18} />
            <h3 className="font-semibold">Search History</h3>
          </div>
          <div className="space-y-2 text-sm">
            {props.history.length === 0 ? (
              <p className="rounded-md bg-[#f4f1ea] p-3 text-[#65605a]">No history yet.</p>
            ) : (
              props.history.map((item) => (
                <p className="rounded-md bg-[#f4f1ea] p-3" key={item.id}>
                  {item.text}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:overflow-hidden">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Ready leads" value={String(props.leads.length)} detail="Current engine result" />
          <Metric label="Email verified" value={props.emailVerified ? "On" : "Off"} detail="Verification filter" />
          <Metric label="Fetch contacts" value={props.fetchContacts ? "On" : "Off"} detail="Contact enrichment" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-black/10 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Filter size={18} />
              <h3 className="font-semibold">Ready to Buy Leads Dashboard</h3>
            </div>
            <div className="flex gap-2">
              {["all", "Hot", "Warm", "Cold"].map((item) => (
                <button className={`h-9 rounded-md border px-3 text-sm font-medium ${props.filter === item ? "border-[#1f6f5b] bg-[#dcebe6] text-[#17483d]" : "border-black/10 bg-white"}`} key={item} onClick={() => props.setFilter(item)} type="button">
                  {item}
                </button>
              ))}
            </div>
          </div>
          {props.loading ? (
            <div className="grid min-h-72 place-items-center p-6 text-center text-[#65605a]">
              <div>
                <Loader2 className="mx-auto mb-3 animate-spin text-[#101418]" size={34} />
                <p className="font-medium">Searching live websites</p>
                <p className="mt-1 text-sm">Fetching websites, emails, phone numbers, and social handles.</p>
              </div>
            </div>
          ) : props.leads.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-6 text-center text-[#65605a]">
              <div>
                <Globe className="mx-auto mb-3" size={32} />
                <p className="font-medium">No results</p>
                <p className="mt-1 text-sm">Choose filters and click Start Engine.</p>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <LeadList leads={props.leads} selected={props.selected} onToggleLead={props.onToggleLead} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
