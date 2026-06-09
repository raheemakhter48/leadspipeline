import { ArrowDownToLine, Save } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { navItems, titleMap } from "@/lib/app-data";
import type { TabId } from "@/lib/app-types";

export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabId; setActiveTab: (tab: TabId) => void }) {
  return (
    <aside className="min-w-0 border-b border-black/10 bg-[#101418] px-3 py-3 text-white lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="mb-3 flex items-center gap-3 lg:mb-8">
        <BrandLogo compact />
        <div className="min-w-0">
          <p className="text-sm text-white/60">LeadsPipeline</p>
          <h1 className="text-xl font-semibold">AI Console</h1>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 text-sm lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left lg:w-full lg:gap-3 ${
              activeTab === id ? "bg-white text-[#101418]" : "text-white/76 hover:bg-white/10"
            }`}
            onClick={() => setActiveTab(id)}
            type="button"
          >
            <Icon size={17} />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function Header({
  activeTab,
  currentUser,
  onLogout,
  selectedCount,
  onSave,
}: {
  activeTab: TabId;
  currentUser?: string;
  onLogout?: () => void;
  selectedCount: number;
  onSave: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-black/10 pb-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#65605a]">SaaS LeadsPipeline workspace</p>
        <h2 className="break-words text-2xl font-semibold sm:text-3xl">{titleMap[activeTab]}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {currentUser && (
          <div className="max-w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
            <span className="text-[#65605a]">Signed in as </span>
            <span className="break-all font-semibold">{currentUser}</span>
          </div>
        )}
        {onLogout && (
          <button className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm font-medium hover:bg-black/5" onClick={onLogout} type="button">
            Logout
          </button>
        )}
        <a
          href="/api/leads/export"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm font-medium hover:bg-black/5"
        >
          <ArrowDownToLine size={16} />
          Export CSV
        </a>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f5b] px-3 text-sm font-medium text-white hover:bg-[#195c4b]"
          onClick={onSave}
          type="button"
          disabled={selectedCount === 0}
        >
          <Save size={16} />
          Save selected
        </button>
      </div>
    </div>
  );
}
