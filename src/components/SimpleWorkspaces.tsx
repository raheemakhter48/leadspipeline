import { Mail, Send } from "lucide-react";
import { Field, ActivityLine } from "@/components/ui";
import { LeadList } from "@/components/LeadList";
import { messageTemplates } from "@/lib/message-templates";
import type { Campaign, Lead } from "@/lib/types";
import type { FormEvent } from "react";

export type MessageQueueItem = {
  body: string;
  id: string;
  status: "queued" | "sending" | "sent" | "failed";
  subject: string;
  to: string;
};

export function CampaignWorkspace(props: {
  campaigns: Campaign[];
  campaignName: string;
  campaignSubject: string;
  campaignTemplate: string;
  setCampaignName: (value: string) => void;
  setCampaignSubject: (value: string) => void;
  setCampaignTemplate: (value: string) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <form className="rounded-md border border-black/10 bg-white p-4 shadow-sm" onSubmit={props.onCreate}>
        <h3 className="mb-4 font-semibold">Create campaign</h3>
        <Field label="Campaign name" value={props.campaignName} onChange={props.setCampaignName} placeholder="Local services outreach" />
        <Field label="Subject" value={props.campaignSubject} onChange={props.setCampaignSubject} placeholder="Quick idea for {{company}}" />
        <label className="mb-4 block text-sm font-medium">
          Template
          <textarea
            className="mt-1 min-h-36 w-full rounded-md border border-black/15 px-3 py-3 outline-none focus:border-[#1f6f5b]"
            value={props.campaignTemplate}
            onChange={(event) => props.setCampaignTemplate(event.target.value)}
          />
        </label>
        <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white" type="submit">
          <Mail size={16} />
          Save draft
        </button>
      </form>
      <div className="rounded-md border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 p-4">
          <h3 className="font-semibold">Campaigns</h3>
        </div>
        <div className="divide-y divide-black/10">
          {props.campaigns.map((campaign) => (
            <div className="grid gap-3 p-4 md:grid-cols-[1fr_120px_120px]" key={campaign.id}>
              <div>
                <p className="font-semibold">{campaign.name}</p>
                <p className="text-sm text-[#65605a]">{campaign.subject}</p>
              </div>
              <span className="rounded-md bg-[#f4f1ea] px-3 py-2 text-center text-sm">{campaign.status}</span>
              <span className="rounded-md bg-[#dcebe6] px-3 py-2 text-center text-sm">{campaign.leadCount} leads</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactsWorkspace({ leads }: { leads: Lead[] }) {
  return (
    <div className="rounded-md border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/10 p-4">
        <h3 className="font-semibold">Saved contacts</h3>
        <p className="text-sm text-[#65605a]">Contacts saved from searches.</p>
      </div>
      <LeadList leads={leads} />
    </div>
  );
}

export function MessagesWorkspace({
  campaigns,
  composer,
  debugMessage,
  leads,
  loading,
  messageSubject,
  notice,
  googleConnected,
  googleLoading,
  manualEmail,
  manualEmails,
  messageTemplate,
  onConnectGoogle,
  onManualEmailChange,
  onAddManualEmail,
  onRemoveManualEmail,
  onSelectTemplate,
  onSelectCampaign,
  onTailorWithAi,
  onSend,
  onSendNow,
  onSendQueuedMessage,
  selectedCampaignId,
  selectedRecipientIds,
  sentMessages,
  setComposer,
  setMessageSubject,
  setSelectedRecipientIds,
}: {
  campaigns: Campaign[];
  composer: string;
  debugMessage: string;
  leads: Lead[];
  loading: boolean;
  messageSubject: string;
  notice: string;
  googleConnected: boolean;
  googleLoading: boolean;
  manualEmail: string;
  manualEmails: string[];
  messageTemplate: string;
  onConnectGoogle: () => void;
  onManualEmailChange: (value: string) => void;
  onAddManualEmail: () => void;
  onRemoveManualEmail: (email: string) => void;
  onSelectTemplate: (templateName: string) => void;
  onSelectCampaign: (campaignId: string) => void;
  onTailorWithAi: () => void;
  onSend: () => void;
  onSendNow: () => void;
  onSendQueuedMessage: (messageId: string) => void;
  selectedCampaignId: string;
  selectedRecipientIds: string[];
  sentMessages: MessageQueueItem[];
  setComposer: (value: string) => void;
  setMessageSubject: (value: string) => void;
  setSelectedRecipientIds: (value: string[]) => void;
}) {
  const selectedLeads = leads.filter((lead) => selectedRecipientIds.includes(lead.id));
  const previewLead = selectedLeads[0] ?? leads[0];
  const recipientCount = selectedRecipientIds.length + manualEmails.length;
  const sentCount = sentMessages.filter((item) => item.status === "sent").length;
  const queuedCount = sentMessages.filter((item) => item.status === "queued" || item.status === "sending").length;
  const sentRecipients = sentMessages.filter((item) => item.status === "sent");
  const previewBody = previewLead ? applyTemplate(composer, previewLead) : composer;
  const previewSubject = previewLead ? applyTemplate(messageSubject, previewLead) : messageSubject;

  function toggleRecipient(id: string) {
    setSelectedRecipientIds(selectedRecipientIds.includes(id) ? selectedRecipientIds.filter((leadId) => leadId !== id) : [...selectedRecipientIds, id]);
  }

  function toggleAllRecipients() {
    setSelectedRecipientIds(selectedRecipientIds.length === leads.length ? [] : leads.map((lead) => lead.id));
  }

  return (
    <div className="grid min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
      {notice && (
        <div className="fixed right-6 top-6 z-50 rounded-md border border-[#1f6f5b]/30 bg-[#dcebe6] px-4 py-3 text-sm font-semibold text-[#1f6f5b] shadow-lg">
          {notice}
        </div>
      )}
      <div className="min-w-0 rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Message composer</h3>
          <button
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium ${
              googleConnected ? "bg-[#dcebe6] text-[#1f6f5b]" : "bg-[#101418] text-white"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={googleLoading}
            onClick={onConnectGoogle}
            type="button"
          >
            {googleLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Mail size={15} />}
            {googleConnected ? "SMTP ready" : "Mail SMTP"}
          </button>
        </div>
        <label className="mb-3 block text-sm font-medium">
          Select from draft
          <select
            className="mt-1 h-11 w-full rounded-md border border-black/15 bg-white px-3 outline-none focus:border-[#1f6f5b]"
            value={selectedCampaignId}
            onChange={(event) => onSelectCampaign(event.target.value)}
          >
            <option value="">Manual message</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3 block text-sm font-medium">
          Select your own template
          <select
            className="mt-1 h-11 w-full rounded-md border border-black/15 bg-white px-3 outline-none focus:border-[#1f6f5b]"
            value={messageTemplate}
            onChange={(event) => onSelectTemplate(event.target.value)}
          >
            <option value="">Choose template...</option>
            {messageTemplates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mb-3 grid max-h-48 gap-2 overflow-y-auto rounded-md border border-black/10 bg-[#f7f5f0] p-2">
          {messageTemplates.map((template) => (
            <button
              className={`rounded-md border p-3 text-left text-sm ${
                messageTemplate === template.name ? "border-[#1f6f5b] bg-[#dcebe6]" : "border-black/10 bg-white"
              }`}
              key={template.name}
              onClick={() => onSelectTemplate(template.name)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{template.name}</p>
                  <p className="text-xs text-[#65605a]">{template.description}</p>
                </div>
                <span className="rounded-md bg-[#101418] px-2 py-1 text-xs text-white">{template.tone}</span>
              </div>
              <div className="mt-3 rounded-md bg-[#0f2831] p-3 text-white">
                <p className="text-[11px] uppercase text-[#f4c96b]">{template.cta}</p>
                <p className="mt-1 font-semibold">{template.subject}</p>
                <p className="mt-2 max-h-12 overflow-hidden text-xs text-white/80">{template.body}</p>
              </div>
            </button>
          ))}
        </div>
        <Field label="Subject" value={messageSubject} onChange={setMessageSubject} placeholder="Quick idea for {{company}}" />
        <label className="mb-3 block text-sm font-medium">
          AI field
          <div className="mt-1 flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]"
              id="ai-tailor-input"
              placeholder="Make it shorter, warmer, dental clinic focused..."
            />
            <button className="h-10 rounded-md border border-black/15 px-3 text-sm font-medium" onClick={onTailorWithAi} type="button">
              Tailor
            </button>
          </div>
        </label>
        <textarea
          className="min-h-44 w-full rounded-md border border-black/15 px-3 py-3 outline-none focus:border-[#1f6f5b]"
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          placeholder="Type email body. You can use {{name}}, {{company}}, {{website}}, {{category}}, {{email}}."
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/15 font-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || recipientCount === 0 || !composer.trim() || !messageSubject.trim()}
            onClick={onSend}
            type="button"
          >
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <Mail size={16} />}
            Queue
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || recipientCount === 0 || !composer.trim() || !messageSubject.trim()}
            onClick={onSendNow}
            type="button"
          >
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={16} />}
            Send now
          </button>
        </div>
        <p className="mt-3 text-xs text-[#65605a]">Messages are sent through the message SMTP configured in the server environment.</p>
        {debugMessage && <p className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700">{debugMessage}</p>}
      </div>
      <div className="grid min-h-0 min-w-0 gap-4">
        <div className="rounded-md border border-black/10 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 p-4">
            <div>
              <h3 className="font-semibold">Recipients</h3>
              <p className="text-sm text-[#65605a]">Saved real leads only.</p>
            </div>
            <button className="rounded-md border border-black/15 px-3 py-2 text-sm disabled:opacity-50" disabled={leads.length === 0} onClick={toggleAllRecipients} type="button">
              {selectedRecipientIds.length === leads.length && leads.length > 0 ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto p-3">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-[#f4f1ea] p-2">
                <p className="font-semibold">{recipientCount}</p>
                <p className="text-[#65605a]">Selected</p>
              </div>
              <div className="rounded-md bg-[#f4f1ea] p-2">
                <p className="font-semibold">{queuedCount}</p>
                <p className="text-[#65605a]">In queue</p>
              </div>
              <div className="rounded-md bg-[#dcebe6] p-2">
                <p className="font-semibold text-[#1f6f5b]">{sentCount}</p>
                <p className="text-[#1f6f5b]">Sent</p>
              </div>
            </div>
            <div className="mb-3 rounded-md border border-black/10 p-3">
              <label className="block text-sm font-medium">
                Add email
                <div className="mt-1 flex min-w-0 gap-2">
                  <textarea
                    className="min-h-20 min-w-0 flex-1 rounded-md border border-black/15 px-3 py-2 outline-none focus:border-[#1f6f5b]"
                    onChange={(event) => onManualEmailChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        onAddManualEmail();
                      }
                    }}
                    placeholder="name@company.com, second@company.com or paste emails on new lines"
                    value={manualEmail}
                  />
                  <button className="h-10 shrink-0 self-start rounded-md bg-[#101418] px-4 text-sm font-medium text-white" onClick={onAddManualEmail} type="button">
                    Add
                  </button>
                </div>
              </label>
              {manualEmails.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {manualEmails.map((email) => (
                    <button
                      className="rounded-md bg-[#dcebe6] px-3 py-1 text-xs font-medium text-[#1f6f5b]"
                      key={email}
                      onClick={() => onRemoveManualEmail(email)}
                      type="button"
                    >
                      {email} x
                    </button>
                  ))}
                </div>
              )}
            </div>
            {leads.length === 0 ? (
              <p className="rounded-md bg-[#f4f1ea] p-3 text-sm text-[#65605a]">No saved contacts yet. Add emails manually or run Ready Engine and save selected leads.</p>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => (
                  <label className="flex items-start gap-3 rounded-md bg-[#f4f1ea] p-3 text-sm" key={lead.id}>
                    <input checked={selectedRecipientIds.includes(lead.id)} onChange={() => toggleRecipient(lead.id)} type="checkbox" />
                    <span>
                      <span className="block font-semibold">{lead.businessName}</span>
                      <span className="block text-[#65605a]">{lead.email || lead.website || lead.phone || "No contact detail"}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-md border border-black/10 p-3">
              <h4 className="mb-2 text-sm font-semibold">Sent emails</h4>
              {sentRecipients.length === 0 ? (
                <p className="text-sm text-[#65605a]">No emails sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {sentRecipients.map((item) => (
                    <div className="rounded-md bg-[#dcebe6] p-2 text-xs" key={item.id}>
                      <p className="font-semibold text-[#1f6f5b]">{item.to}</p>
                      <p className="text-[#3f3b37]">{item.subject}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-md border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 p-4">
            <h3 className="font-semibold">Preview</h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p className="font-semibold">{previewSubject || "No subject"}</p>
            <p className="whitespace-pre-wrap rounded-md bg-[#f4f1ea] p-3 text-[#3f3b37]">{previewBody || "Select a draft or type an email body."}</p>
          </div>
        </div>
        <div className="rounded-md border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 p-4">
            <h3 className="font-semibold">Message queue</h3>
          </div>
          <div className="max-h-64 divide-y divide-black/10 overflow-y-auto">
            {sentMessages.length === 0 ? (
              <p className="p-4 text-sm text-[#65605a]">No messages queued yet.</p>
            ) : (
              sentMessages.map((item) => (
                <div className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto]" key={item.id}>
                  <div>
                    <p className="font-semibold">To: {item.to}</p>
                    <p>Subject: {item.subject}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[#3f3b37]">{item.body}</p>
                    <p className="mt-2 text-xs uppercase text-[#65605a]">{item.status}</p>
                  </div>
                  <button
                    className="h-10 rounded-md bg-[#101418] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={item.status === "sending" || item.status === "sent"}
                    onClick={() => onSendQueuedMessage(item.id)}
                    type="button"
                  >
                    {item.status === "sending" ? "Sending..." : item.status === "sent" ? "Sent" : "Send"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function applyTemplate(template: string, lead: Lead) {
  return template
    .replaceAll("{{name}}", lead.businessName)
    .replaceAll("{{company}}", lead.businessName)
    .replaceAll("{{website}}", lead.website || "your website")
    .replaceAll("{{category}}", lead.category)
    .replaceAll("{{email}}", lead.email || "");
}

export function SettingsWorkspace({ message }: { message: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-semibold">Integrations</h3>
        <div className="space-y-3 text-sm">
          <ActivityLine text="GROQ_API_KEY enables Groq enrichment." />
          <ActivityLine text="DATABASE_URL is prepared for PostgreSQL migration." />
          <ActivityLine text="REDIS_URL is prepared for BullMQ email workers." />
        </div>
      </div>
      <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-semibold">System status</h3>
        <p className="rounded-md bg-[#f4f1ea] p-3 text-sm">{message}</p>
      </div>
    </div>
  );
}
