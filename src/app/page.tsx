"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AiIntelWorkspace, type AiIntel } from "@/components/AiIntelWorkspace";
import { AuthScreen, type AuthMode } from "@/components/AuthScreen";
import { Dashboard } from "@/components/Dashboard";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { ReadyToBuyWorkspace } from "@/components/ReadyToBuyWorkspace";
import { Header, Sidebar } from "@/components/Shell";
import {
  CampaignWorkspace,
  ContactsWorkspace,
  MessagesWorkspace,
  SettingsWorkspace,
  type MessageQueueItem,
} from "@/components/SimpleWorkspaces";
import type { QuickSearch, ReadyHistoryItem, TabId } from "@/lib/app-types";
import { defaultRegion } from "@/lib/locations";
import { messageTemplates } from "@/lib/message-templates";
import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/lib/auth-db";
import type { Campaign, Lead } from "@/lib/types";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authOtpCode, setAuthOtpCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [category, setCategory] = useState("dentist");
  const [location, setLocation] = useState("Austin, TX");
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("idle");
  const [message, setMessage] = useState("Ready to search leads.");
  const [campaignName, setCampaignName] = useState("Local business outreach");
  const [campaignSubject, setCampaignSubject] = useState("Quick idea for {{company}}");
  const [campaignTemplate, setCampaignTemplate] = useState("Hi {{name}}, I found {{company}} and noticed an opportunity to improve your lead flow.");
  const [composer, setComposer] = useState("Hi {{name}}, I can help {{company}} get more qualified leads this month.");
  const [messageSubject, setMessageSubject] = useState("Quick idea for {{company}}");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [messageQueueLoading, setMessageQueueLoading] = useState(false);
  const [messageNotice, setMessageNotice] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState<MessageQueueItem[]>([]);
  const [aiCompany, setAiCompany] = useState("");
  const [aiWebsite, setAiWebsite] = useState("");
  const [aiPrompt, setAiPrompt] = useState("Find company intel and write a warm B2B outreach email.");
  const [aiIntel, setAiIntel] = useState<AiIntel | null>(null);
  const [aiSubject, setAiSubject] = useState("");
  const [aiBody, setAiBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [targetWebsite, setTargetWebsite] = useState("");
  const [readyService, setReadyService] = useState("SEO Services");
  const [companyStage, setCompanyStage] = useState("Growth Stage");
  const [readyCategory, setReadyCategory] = useState("Healthcare");
  const [readyCountry, setReadyCountry] = useState("United States");
  const [readyState, setReadyState] = useState("All Regions");
  const [readyCity, setReadyCity] = useState("All Cities");
  const [maxReadyLeads, setMaxReadyLeads] = useState(50);
  const [emailVerified, setEmailVerified] = useState(true);
  const [directDial, setDirectDial] = useState(false);
  const [decisionMaker, setDecisionMaker] = useState(true);
  const [includeWebResults, setIncludeWebResults] = useState(true);
  const [fetchContacts, setFetchContacts] = useState(true);
  const [readyLeads, setReadyLeads] = useState<Lead[]>([]);
  const [readyHistory, setReadyHistory] = useState<ReadyHistoryItem[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem("leadspipeline_user");
      if (saved) setAuthUser(JSON.parse(saved) as AuthUser);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    async function loadSavedData() {
      const [leadResponse, campaignResponse] = await Promise.all([fetch("/api/leads"), fetch("/api/campaigns")]);
      const leadPayload = await leadResponse.json();
      const campaignPayload = await campaignResponse.json();
      setSavedLeads(leadPayload.leads ?? []);
      setCampaigns(campaignPayload.campaigns ?? []);
      const mailResponse = await apiFetch("/api/mail/status");
      const mailPayload = await mailResponse.json();
      setGoogleConnected(Boolean(mailPayload.configured));
    }

    void loadSavedData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      queueMicrotask(async () => {
        const googleResponse = await fetch("/api/google/status");
        const googlePayload = await googleResponse.json();
        if (googlePayload.email) {
          const user = {
            email: googlePayload.email,
            id: googlePayload.email,
            name: googlePayload.email.split("@")[0],
            provider: "google",
          };
          setAuthUser(user);
          window.localStorage.setItem("leadspipeline_user", JSON.stringify(user));
        }
        setGoogleConnected(true);
        setMessage("Google account connected with Gmail send permission.");
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (google === "cancelled") {
      queueMicrotask(() => setMessage("Google connection was cancelled."));
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (google === "missing_credentials") {
      queueMicrotask(() => setMessage("Google credentials missing. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local."));
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (google === "token_error") {
      queueMicrotask(() => setMessage("Google token exchange failed. Check OAuth redirect URI and credentials."));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthStatus("");

    const endpoint = authMode === "login" ? "/api/auth/login" : authMode === "signup" ? "/api/auth/signup" : authMode === "otp" ? "/api/auth/verify-otp" : "/api/auth/forgot";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: authOtpCode, email: authEmail, name: authName, password: authPassword }),
    });
    const payload = await response.json();

    setAuthLoading(false);

    if (!response.ok) {
      setAuthError(payload.error ?? "Authentication failed.");
      return;
    }

    if (authMode === "forgot") {
      setAuthStatus(`Reset request created. ${payload.resetUrl ?? ""}`);
      return;
    }

    setAuthUser(payload.user);
    window.localStorage.setItem("leadspipeline_user", JSON.stringify(payload.user));
  }

  async function requestOtp() {
    if (!authEmail.trim()) {
      setAuthError("Enter your email first.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthStatus("");
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail }),
    });
    const payload = await response.json();
    setAuthLoading(false);

    if (!response.ok) {
      setAuthError(payload.error ?? "OTP request failed.");
      return;
    }

    setAuthStatus(payload.devCode ? `${payload.message} Code: ${payload.devCode}` : payload.message);
  }

  async function googleSignup() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/google/connect");
      const payload = await safeJson(response);
      if (!response.ok || !payload.authUrl) {
        setAuthError(payload.error ?? "Google signup is not configured.");
        return;
      }
      window.location.href = payload.authUrl;
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem("leadspipeline_user");
    setAuthUser(null);
    setAuthPassword("");
    setAuthMode("login");
  }

  const visibleLeads = leads.length > 0 ? leads : savedLeads;
  const filteredLeads = useMemo(() => {
    if (filter === "all") return visibleLeads;
    return visibleLeads.filter((lead) => lead.temperature === filter);
  }, [filter, visibleLeads]);

  const filteredReadyLeads = useMemo(() => {
    if (filter === "all") return readyLeads;
    return readyLeads.filter((lead) => lead.temperature === filter);
  }, [filter, readyLeads]);

  const stats = useMemo(() => {
    const contactable = savedLeads.filter((lead) => lead.phone || lead.website).length;
    const verifiedRate = savedLeads.length ? Math.round((contactable / savedLeads.length) * 100) : 0;

    return [
      { label: "Collected leads", value: String(savedLeads.length), detail: "Saved lead database" },
      { label: "Verified contact rate", value: `${verifiedRate}%`, detail: "Website or phone found" },
      { label: "Hot leads", value: String(savedLeads.filter((lead) => lead.temperature === "Hot").length), detail: "AI score above 78" },
      { label: "Campaigns", value: String(campaigns.length), detail: "Draft and running campaigns" },
    ];
  }, [campaigns.length, savedLeads]);

  async function searchLeads(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMode("loading");
    setMessage("Searching leads...");
    setActiveTab(activeTab === "dashboard" ? "google" : activeTab);

    const response = await fetch("/api/leads/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, location, keyword, limit }),
    });
    const payload = await response.json();
    const searchResults = payload.leads ?? [];

    setLeads(searchResults);
    setSelected(searchResults.map((lead: Lead) => lead.id));
    setMode(payload.mode ?? "done");
    setMessage(payload.warning ?? "Leads loaded.");
  }

  async function runQuickSearch(input: QuickSearch) {
    setReadyCategory(input.category);
    setReadyService(input.service);
    setCompanyStage(input.stage);
    setReadyCountry(input.country);
    setReadyState(input.state);
    setReadyCity(input.city);
    setKeyword(input.keyword);
    setActiveTab("ready");
    setMode("loading");
    setMessage("Running dashboard quick search...");
    setReadyLeads([]);
    setLeads([]);
    setSelected([]);

    const response = await fetch("/api/ready/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: input.category,
        city: input.city,
        country: input.country,
        directDial,
        emailVerified,
        fetchContacts,
        includeWebResults,
        decisionMaker,
        max: maxReadyLeads,
        service: input.service,
        stage: input.stage,
        state: input.state,
        targetWebsite,
      }),
    });
    const payload = await response.json();
    const liveLeads = payload.leads ?? [];
    setReadyLeads(liveLeads);
    setLeads(liveLeads);
    setSelected(liveLeads.map((lead: Lead) => lead.id));
    setReadyHistory((current) => [
      {
        id: crypto.randomUUID(),
        text: `${liveLeads.length} live ${input.category} leads for ${input.service} - ${new Date().toLocaleTimeString()}`,
      },
      ...current,
    ]);
    setMessage(payload.warning || `${liveLeads.length} live ready-to-buy leads found.`);
    setMode(payload.mode ?? "done");
  }

  async function saveSelected() {
    const leadsToSave = leads.filter((lead) => selected.includes(lead.id));
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: leadsToSave }),
    });
    const payload = await response.json();
    setSavedLeads(payload.leads ?? []);
    setMessage(`${payload.saved} leads saved to contacts.`);
    setSelected([]);
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: campaignName, subject: campaignSubject, template: campaignTemplate }),
    });
    const payload = await response.json();
    setCampaigns((current) => [payload.campaign, ...current]);
    setSelectedCampaignId(payload.campaign.id);
    setMessageSubject(payload.campaign.subject);
    setComposer(payload.campaign.template);
    setMessage(`Campaign "${payload.campaign.name}" saved as draft.`);
  }

  function toggleLead(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((leadId) => leadId !== id) : [...current, id]));
  }

  function selectCampaignDraft(campaignId: string) {
    setSelectedCampaignId(campaignId);
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    setMessageSubject(campaign.subject);
    setComposer(campaign.template);
    setMessage(`Draft "${campaign.name}" loaded.`);
  }

  function selectMessageTemplate(templateName: string) {
    setMessageTemplate(templateName);
    const template = messageTemplates.find((item) => item.name === templateName);
    if (!template) return;
    setMessageSubject(template.subject);
    setComposer(template.body);
    setMessage(`Template "${template.name}" loaded.`);
  }

  function applyMessageTemplate(template: string, lead: Lead) {
    return template
      .replaceAll("{{name}}", lead.businessName)
      .replaceAll("{{company}}", lead.businessName)
      .replaceAll("{{website}}", lead.website || "your website")
      .replaceAll("{{category}}", lead.category)
      .replaceAll("{{email}}", lead.email || "");
  }

  function applyManualEmailTemplate(template: string, email: string) {
    const company = email.split("@")[1]?.split(".")[0] ?? "your company";
    return template
      .replaceAll("{{name}}", email.split("@")[0])
      .replaceAll("{{company}}", company)
      .replaceAll("{{website}}", `https://${email.split("@")[1] ?? ""}`)
      .replaceAll("{{category}}", "business")
      .replaceAll("{{email}}", email);
  }

  function addManualEmail() {
    const parsedEmails = manualEmail
      .toLowerCase()
      .match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/g);

    if (!parsedEmails?.length) {
      setMessage("Enter valid email address.");
      return;
    }

    const existingEmails = new Set(manualEmails);
    const newEmails = Array.from(new Set(parsedEmails)).filter((email) => !existingEmails.has(email));

    if (newEmails.length === 0) {
      setMessage("Email is already added.");
      return;
    }

    setManualEmails((current) => [...current, ...newEmails]);
    setManualEmail("");
    setMessage(newEmails.length === 1 ? `${newEmails[0]} added to recipients.` : `${newEmails.length} emails added to recipients.`);
  }

  function removeManualEmail(email: string) {
    setManualEmails((current) => current.filter((item) => item !== email));
  }

  function showMessageNotice(text: string) {
    setMessageNotice(text);
    window.setTimeout(() => setMessageNotice(""), 3000);
  }

  function buildMessages() {
    const recipients = savedLeads.filter((lead) => selectedRecipientIds.includes(lead.id));
    const leadMessages: MessageQueueItem[] = recipients.map((lead) => {
      const to = lead.email || lead.website || lead.phone || "No contact detail";
      return {
        body: applyMessageTemplate(composer, lead),
        id: crypto.randomUUID(),
        status: "queued",
        subject: applyMessageTemplate(messageSubject, lead),
        to,
      };
    });
    const manualMessages: MessageQueueItem[] = manualEmails.map((email) => {
      return {
        body: applyManualEmailTemplate(composer, email),
        id: crypto.randomUUID(),
        status: "queued",
        subject: applyManualEmailTemplate(messageSubject, email),
        to: email,
      };
    });

    return [...leadMessages, ...manualMessages].filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.to));
  }

  async function sendMessage() {
    if (!composer.trim() || !messageSubject.trim() || selectedRecipientIds.length + manualEmails.length === 0) {
      setMessage("Add an email or select saved contacts first.");
      return;
    }

    setMessageQueueLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const queued = buildMessages();
    setSentMessages((current) => [...queued, ...current]);
    setSelectedRecipientIds([]);
    setManualEmails([]);
    setMessage(`${queued.length} messages queued.`);
    setMessageQueueLoading(false);
  }

  async function sendNow() {
    if (!composer.trim() || !messageSubject.trim() || selectedRecipientIds.length + manualEmails.length === 0) {
      setMessage("Add an email or select saved contacts first.");
      return;
    }

    const outgoing = buildMessages().map((item) => ({ ...item, status: "sending" as const }));
    setSentMessages((current) => [...outgoing, ...current]);
    setMessageQueueLoading(true);
    let sentCount = 0;

    for (const item of outgoing) {
      const response = await apiFetch("/api/google/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: item.body, subject: item.subject, to: item.to }),
      });
      sentCount += response.ok ? 1 : 0;
      setSentMessages((current) =>
        current.map((queued) => (queued.id === item.id ? { ...queued, status: response.ok ? "sent" : "failed" } : queued)),
      );
      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload.error ?? "Email send failed.");
        break;
      }
    }

    setSelectedRecipientIds([]);
    setManualEmails([]);
    setMessageQueueLoading(false);
    if (sentCount === outgoing.length) {
      setMessage(`${sentCount} emails sent.`);
      showMessageNotice("Mail sent successfully.");
    }
  }

  async function tailorWithAi() {
    const input = document.querySelector<HTMLInputElement>("#ai-tailor-input")?.value.trim() ?? "";
    if (!input) {
      setMessage("Add an AI instruction first.");
      return;
    }
    setMessageQueueLoading(true);
    try {
      const response = await apiFetch("/api/messages/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: composer, instruction: input, subject: messageSubject }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "AI tailoring failed.");
        return;
      }
      setMessageSubject(payload.subject ?? messageSubject);
      setComposer(payload.body ?? composer);
      setMessage(payload.warning ?? "Message tailored.");
    } finally {
      setMessageQueueLoading(false);
    }
  }

  async function runAiIntel() {
    if (!aiCompany.trim() && !aiWebsite.trim()) {
      setMessage("Add company name or website first.");
      return;
    }

    setAiLoading(true);
    setMessage("AI is researching company intel...");
    try {
      const response = await apiFetch("/api/ai/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: aiCompany, prompt: aiPrompt, website: aiWebsite }),
      });
      const payload = (await response.json()) as AiIntel & { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "AI intel failed.");
        return;
      }
      setAiIntel(payload);
      setAiSubject(payload.subject ?? "");
      setAiBody(payload.body ?? "");
      setMessage(payload.warning ?? "AI intel and message generated.");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiToMessages() {
    setMessageSubject(aiSubject);
    setComposer(aiBody);
    setActiveTab("messages");
    setMessage("AI message applied to Messages composer.");
  }

  async function sendQueuedMessage(messageId: string) {
    const queued = sentMessages.find((item) => item.id === messageId);
    if (!queued) return;

    setSentMessages((current) => current.map((item) => (item.id === messageId ? { ...item, status: "sending" } : item)));
    const response = await apiFetch("/api/google/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: queued.body, subject: queued.subject, to: queued.to }),
    });
    const payload = await response.json();
    setSentMessages((current) => current.map((item) => (item.id === messageId ? { ...item, status: response.ok ? "sent" : "failed" } : item)));
    setMessage(response.ok ? `Email sent to ${queued.to}.` : payload.error ?? "Email send failed.");
    if (response.ok) showMessageNotice("Mail sent successfully.");
  }

  async function connectGoogle() {
    setGoogleConnectLoading(true);
    setMessage("Checking message SMTP...");
    try {
      const response = await apiFetch("/api/mail/status");
      const payload = await response.json();
      setGoogleConnected(Boolean(payload.configured));
      setMessage(payload.configured ? "Message SMTP is ready." : "Message SMTP is not configured.");
    } finally {
      setGoogleConnectLoading(false);
    }
  }

  async function safeJson(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as { authUrl?: string; error?: string };
    }

    const text = await response.text();
    return {
      error: text.includes("Runtime")
        ? "Server error while preparing Google signup. Restart dev server and try again."
        : "Google signup returned an invalid response.",
    };
  }

  async function startReadyEngine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode("loading");
    setMessage("Searching live public web results...");
    setReadyLeads([]);
    setLeads([]);
    setSelected([]);

    const response = await fetch("/api/ready/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: readyCategory,
        city: readyCity,
        country: readyCountry,
        directDial,
        emailVerified,
        fetchContacts,
        includeWebResults,
        decisionMaker,
        max: maxReadyLeads,
        service: readyService,
        stage: companyStage,
        state: readyState,
        targetWebsite,
      }),
    });
    const payload = await response.json();
    const liveLeads = payload.leads ?? [];

    setReadyLeads(liveLeads);
    setLeads(liveLeads);
    setSelected(liveLeads.map((lead: Lead) => lead.id));
    setMode(payload.mode ?? "done");
    setReadyHistory((current) => [
      {
        id: crypto.randomUUID(),
        text: `${liveLeads.length} live ${readyCategory} leads for ${readyService} - ${new Date().toLocaleTimeString()}`,
      },
      ...current,
    ]);
    setMessage(payload.warning || `${liveLeads.length} live ready-to-buy leads found.`);
  }

  if (!authChecked) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f1ea] text-sm text-[#65605a]">Loading LeadsPipeline...</main>;
  }

  if (!authUser) {
    return (
      <AuthScreen
        authError={authError}
        authLoading={authLoading}
        authMode={authMode}
        authStatus={authStatus}
        email={authEmail}
        name={authName}
        password={authPassword}
        otpCode={authOtpCode}
        setAuthMode={setAuthMode}
        setEmail={setAuthEmail}
        setName={setAuthName}
        setPassword={setAuthPassword}
        setOtpCode={setAuthOtpCode}
        onGoogle={googleSignup}
        onRequestOtp={requestOtp}
        onSubmit={submitAuth}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#171717] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:min-h-0 lg:grid-cols-[260px_1fr]">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <section className="flex min-h-0 flex-col px-4 py-5 sm:px-6 lg:overflow-hidden lg:px-8">
          <Header activeTab={activeTab} currentUser={authUser.email} selectedCount={selected.length} onLogout={logout} onSave={saveSelected} />
          <div className="min-h-0 flex-1 pb-8 lg:overflow-y-auto">

          {activeTab === "dashboard" && (
            <Dashboard
              campaigns={campaigns}
              loading={mode === "loading"}
              leads={savedLeads}
              onOpenCampaigns={() => setActiveTab("campaigns")}
              onOpenContacts={() => setActiveTab("contacts")}
              onOpenReady={() => setActiveTab("ready")}
              onQuickSearch={runQuickSearch}
              stats={stats}
            />
          )}

          {activeTab === "google" && (
            <LeadWorkspace
              activeTab={activeTab}
              category={category}
              filteredLeads={filteredLeads}
              filter={filter}
              keyword={keyword}
              limit={limit}
              location={location}
              message={message}
              mode={mode}
              selected={selected}
              setCategory={setCategory}
              setFilter={setFilter}
              setKeyword={setKeyword}
              setLimit={setLimit}
              setLocation={setLocation}
              stats={stats}
              onSearch={searchLeads}
              onToggleLead={toggleLead}
            />
          )}

          {activeTab === "ai" && (
            <AiIntelWorkspace
              aiBody={aiBody}
              aiCompany={aiCompany}
              aiIntel={aiIntel}
              aiLoading={aiLoading}
              aiPrompt={aiPrompt}
              aiSubject={aiSubject}
              aiWebsite={aiWebsite}
              setAiBody={setAiBody}
              setAiCompany={setAiCompany}
              setAiPrompt={setAiPrompt}
              setAiSubject={setAiSubject}
              setAiWebsite={setAiWebsite}
              onApplyToMessages={applyAiToMessages}
              onRunIntel={runAiIntel}
            />
          )}

          {activeTab === "ready" && (
            <ReadyToBuyWorkspace
              companyStage={companyStage}
              dailyCount={readyLeads.length}
              decisionMaker={decisionMaker}
              directDial={directDial}
              emailVerified={emailVerified}
              fetchContacts={fetchContacts}
              filter={filter}
              history={readyHistory}
              includeWebResults={includeWebResults}
              leads={filteredReadyLeads}
              loading={mode === "loading"}
              maxReadyLeads={maxReadyLeads}
              readyCategory={readyCategory}
              readyCity={readyCity}
              readyCountry={readyCountry}
              readyService={readyService}
              readyState={readyState}
              selected={selected}
              targetWebsite={targetWebsite}
              setCompanyStage={setCompanyStage}
              setDecisionMaker={setDecisionMaker}
              setDirectDial={setDirectDial}
              setEmailVerified={setEmailVerified}
              setFetchContacts={setFetchContacts}
              setFilter={setFilter}
              setIncludeWebResults={setIncludeWebResults}
              setMaxReadyLeads={setMaxReadyLeads}
              setReadyCategory={setReadyCategory}
              setReadyCity={setReadyCity}
              setReadyCountry={(value) => {
                setReadyCountry(value);
                setReadyState(defaultRegion(value));
                setReadyCity("All Cities");
                setReadyLeads([]);
                setLeads([]);
                setSelected([]);
              }}
              setReadyService={setReadyService}
              setReadyState={(value) => {
                setReadyState(value);
                setReadyCity("All Cities");
                setReadyLeads([]);
                setLeads([]);
                setSelected([]);
              }}
              setTargetWebsite={setTargetWebsite}
              onStart={startReadyEngine}
              onToggleLead={toggleLead}
            />
          )}

          {activeTab === "campaigns" && <CampaignWorkspace campaigns={campaigns} campaignName={campaignName} campaignSubject={campaignSubject} campaignTemplate={campaignTemplate} setCampaignName={setCampaignName} setCampaignSubject={setCampaignSubject} setCampaignTemplate={setCampaignTemplate} onCreate={createCampaign} />}
          {activeTab === "contacts" && <ContactsWorkspace leads={savedLeads} />}
          {activeTab === "messages" && (
            <MessagesWorkspace
              campaigns={campaigns}
              composer={composer}
              googleConnected={googleConnected}
              googleLoading={googleConnectLoading}
              leads={savedLeads}
              loading={messageQueueLoading}
              manualEmail={manualEmail}
              manualEmails={manualEmails}
              messageSubject={messageSubject}
              messageTemplate={messageTemplate}
              notice={messageNotice}
              selectedCampaignId={selectedCampaignId}
              selectedRecipientIds={selectedRecipientIds}
              sentMessages={sentMessages}
              setComposer={setComposer}
              setMessageSubject={setMessageSubject}
              setSelectedRecipientIds={setSelectedRecipientIds}
              onAddManualEmail={addManualEmail}
              onConnectGoogle={connectGoogle}
              onManualEmailChange={setManualEmail}
              onRemoveManualEmail={removeManualEmail}
              onSelectCampaign={selectCampaignDraft}
              onSelectTemplate={selectMessageTemplate}
              onSend={sendMessage}
              onSendNow={sendNow}
              onSendQueuedMessage={sendQueuedMessage}
              onTailorWithAi={tailorWithAi}
            />
          )}
          {activeTab === "settings" && <SettingsWorkspace message={message} />}
          </div>
        </section>
      </div>
    </main>
  );
}
