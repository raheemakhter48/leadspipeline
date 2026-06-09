import type { Campaign, Lead } from "@/lib/types";
import type { QuickSearch, Stat } from "@/lib/app-types";
import { quickSearches } from "@/lib/app-data";
import { ActivityLine, StatsGrid } from "@/components/ui";

export function Dashboard({
  campaigns,
  loading,
  leads,
  onOpenCampaigns,
  onOpenContacts,
  onOpenReady,
  onQuickSearch,
  stats,
}: {
  campaigns: Campaign[];
  loading: boolean;
  leads: Lead[];
  onOpenCampaigns: () => void;
  onOpenContacts: () => void;
  onOpenReady: () => void;
  onQuickSearch: (input: QuickSearch) => void;
  stats: Stat[];
}) {
  const temperatureRows = ["Hot", "Warm", "Cold"].map((temperature) => ({
    label: temperature,
    value: leads.filter((lead) => lead.temperature === temperature).length,
  }));
  const sourceRows = ["web_search", "google_maps", "open_maps"].map((source) => ({
    label: source.replace("_", " "),
    value: leads.filter((lead) => lead.source === source).length,
  }));
  const averageScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.aiScore, 0) / leads.length) : 0;
  const scoreRows = [
    { label: "80+", value: leads.filter((lead) => lead.aiScore >= 80).length },
    { label: "60-79", value: leads.filter((lead) => lead.aiScore >= 60 && lead.aiScore < 80).length },
    { label: "<60", value: leads.filter((lead) => lead.aiScore < 60).length },
  ];
  const weeklyRows = lastSevenDays().map((day) => ({
    label: day.label,
    value: leads.filter((lead) => new Date(lead.createdAt).toDateString() === day.date.toDateString()).length,
  }));

  return (
    <div className="space-y-4">
      <StatsGrid stats={stats} />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <BarChartCard title="Lead temperature" rows={temperatureRows} accent="#1f6f5b" emptyText="No saved leads yet." />
        <BarChartCard title="Lead sources" rows={sourceRows} accent="#233f91" emptyText="No source data yet." />
        <BarChartCard title={`AI score avg ${averageScore}`} rows={scoreRows} accent="#18bf8b" emptyText="No score data yet." />
        <MiniColumnChart title="Saved this week" rows={weeklyRows} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Quick lead searches</h3>
            <button className="rounded-md bg-[#101418] px-3 py-2 text-sm font-medium text-white" onClick={onOpenReady} type="button">
              Open Ready Engine
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {quickSearches.map((item) => (
            <button
                className="rounded-md border border-black/10 bg-[#f7f5f0] p-4 text-left hover:border-[#1f6f5b] disabled:opacity-60"
                key={`${item.category}-${item.service}-${item.country}-${item.city}`}
                disabled={loading}
                onClick={() => onQuickSearch(item)}
                type="button"
              >
                <p className="font-semibold">{item.category}</p>
                <p className="text-sm text-[#65605a]">{item.service}</p>
                <p className="mt-2 text-xs text-[#65605a]">{loading ? "Loading..." : item.keyword}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Recent activity</h3>
          <div className="space-y-3 text-sm">
            <ActivityLine text={`${leads.length} contacts available in database`} />
            <ActivityLine text={`${campaigns.length} campaign drafts created`} />
            <ActivityLine text="CSV export uses saved lead database" />
          </div>
          <div className="mt-4 grid gap-2">
            <button className="rounded-md border border-black/10 px-3 py-2 text-left text-sm hover:bg-[#f7f5f0]" onClick={onOpenContacts} type="button">
              View saved contacts
            </button>
            <button className="rounded-md border border-black/10 px-3 py-2 text-left text-sm hover:bg-[#f7f5f0]" onClick={onOpenCampaigns} type="button">
              Open campaigns
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Latest saved leads</h3>
        {leads.length === 0 ? (
          <p className="text-sm text-[#65605a]">No saved contacts yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {leads.slice(0, 6).map((lead) => (
              <a className="rounded-md border border-black/10 bg-[#f7f5f0] p-3 text-sm hover:border-[#1f6f5b]" href={lead.website || "#"} key={lead.id} rel="noreferrer" target="_blank">
                <p className="font-semibold">{lead.businessName}</p>
                <p className="mt-1 text-[#65605a]">{lead.email || lead.phone || "No contact yet"}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BarChartCard({
  accent,
  emptyText,
  rows,
  title,
}: {
  accent: string;
  emptyText: string;
  rows: { label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 0);

  return (
    <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {max === 0 ? (
        <p className="rounded-md bg-[#f4f1ea] p-3 text-sm text-[#65605a]">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="capitalize text-[#65605a]">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f4f1ea]">
                <div className="h-full rounded-full" style={{ backgroundColor: accent, width: `${Math.max((row.value / max) * 100, 6)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniColumnChart({ rows, title }: { rows: { label: string; value: number }[]; title: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="flex h-32 items-end gap-2">
        {rows.map((row) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={row.label}>
            <div className="flex h-24 w-full items-end rounded-md bg-[#f4f1ea]">
              <div className="w-full rounded-md bg-[#101418]" style={{ height: `${Math.max((row.value / max) * 100, row.value ? 10 : 0)}%` }} />
            </div>
            <span className="text-[11px] text-[#65605a]">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      date,
      label: date.toLocaleDateString("en", { weekday: "short" }),
    };
  });
}
