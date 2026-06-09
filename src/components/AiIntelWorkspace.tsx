import { Brain, Building2, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import { Field } from "@/components/ui";

export type AiIntel = {
  body: string;
  companyIntel: string[];
  outreachAngles: string[];
  subject: string;
  warning?: string;
};

export function AiIntelWorkspace({
  aiBody,
  aiCompany,
  aiIntel,
  aiLoading,
  aiPrompt,
  aiSubject,
  aiWebsite,
  setAiBody,
  setAiCompany,
  setAiPrompt,
  setAiSubject,
  setAiWebsite,
  onApplyToMessages,
  onRunIntel,
}: {
  aiBody: string;
  aiCompany: string;
  aiIntel: AiIntel | null;
  aiLoading: boolean;
  aiPrompt: string;
  aiSubject: string;
  aiWebsite: string;
  setAiBody: (value: string) => void;
  setAiCompany: (value: string) => void;
  setAiPrompt: (value: string) => void;
  setAiSubject: (value: string) => void;
  setAiWebsite: (value: string) => void;
  onApplyToMessages: () => void;
  onRunIntel: () => void;
}) {
  return (
    <div className="grid min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(320px,430px)_1fr]">
      <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Brain size={18} />
          <h3 className="font-semibold">AI company intel</h3>
        </div>
        <Field label="Company name" value={aiCompany} onChange={setAiCompany} placeholder="Xcapit, Northline Dental..." />
        <Field label="Company website" value={aiWebsite} onChange={setAiWebsite} placeholder="https://company.com" />
        <label className="mb-3 block text-sm font-medium">
          Ask AI
          <textarea
            className="mt-1 min-h-36 w-full rounded-md border border-black/15 px-3 py-3 outline-none focus:border-[#1f6f5b]"
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Find company pain points, growth angle, and write a warm outreach email for web design / SEO / app development..."
            value={aiPrompt}
          />
        </label>
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={aiLoading || (!aiCompany.trim() && !aiWebsite.trim())}
          onClick={onRunIntel}
          type="button"
        >
          {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {aiLoading ? "Researching..." : "Research & write"}
        </button>
        <p className="mt-3 text-sm text-[#65605a]">AI uses the company website text when provided, then writes editable outreach copy.</p>
      </div>

      <div className="grid min-h-0 min-w-0 gap-4">
        <div className="rounded-md border border-black/10 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/10 p-4">
            <Building2 size={18} />
            <h3 className="font-semibold">Company intelligence</h3>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            <InfoBlock title="Intel" items={aiIntel?.companyIntel ?? []} empty="Run AI to see company signals." />
            <InfoBlock title="Outreach angles" items={aiIntel?.outreachAngles ?? []} empty="AI will suggest practical angles here." />
          </div>
          {aiIntel?.warning && <p className="mx-4 mb-4 rounded-md bg-[#f4f1ea] p-3 text-sm text-[#65605a]">{aiIntel.warning}</p>}
        </div>

        <div className="rounded-md border border-black/10 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/10 p-4">
            <MessageSquareText size={18} />
            <h3 className="font-semibold">Generated message</h3>
          </div>
          <div className="p-4">
            <Field label="Subject" value={aiSubject} onChange={setAiSubject} placeholder="Quick idea for {{company}}" />
            <label className="mb-3 block text-sm font-medium">
              Email body
              <textarea
                className="mt-1 min-h-64 w-full rounded-md border border-black/15 px-3 py-3 outline-none focus:border-[#1f6f5b]"
                onChange={(event) => setAiBody(event.target.value)}
                placeholder="AI generated email will appear here. You can edit it before using it in Messages."
                value={aiBody}
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1f6f5b] px-4 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!aiSubject.trim() || !aiBody.trim()}
              onClick={onApplyToMessages}
              type="button"
            >
              <Send size={16} />
              Use in Messages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ empty, items, title }: { empty: string; items: string[]; title: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-[#f7f5f0] p-3">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-[#65605a]">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <p className="rounded-md bg-white p-3 text-sm" key={item}>
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
