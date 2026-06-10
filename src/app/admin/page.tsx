"use client";

import { Activity, CheckCircle2, Mail, RefreshCw, Server, Shield, Users, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AdminStatus = {
  service: string;
  status: string;
  adminTokenConfigured: boolean;
  allowedOrigins: string[];
  groq: {
    configured: boolean;
    model: string;
  };
  mail: {
    configured: boolean;
    provider: string;
    smtpHost: string;
    smtpPort: string;
    smtpSecure: string;
    smtpFrom: string;
  };
  features: {
    aiIntel: boolean;
    htmlEmail: boolean;
    messageTailor: boolean;
  };
};

type MailUserStats = {
  failed: number;
  lastActivity: string;
  sent: number;
  total: number;
  userEmail: string;
};

type MailLog = {
  id: string;
  userEmail: string;
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed";
  backendResponse: string;
  errorMessage: string;
  sentAt?: string;
  createdAt: string;
};

const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://92.4.71.166:7860";

export default function AdminPage() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [adminToken, setAdminToken] = useState("");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [mailLogs, setMailLogs] = useState<MailLog[]>([]);
  const [mailUsers, setMailUsers] = useState<MailUserStats[]>([]);

  const normalizedBackendUrl = useMemo(() => backendUrl.replace(/\/$/, ""), [backendUrl]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("leadspipeline_admin_token") ?? "";
    const savedUrl = window.localStorage.getItem("leadspipeline_backend_url") ?? DEFAULT_BACKEND_URL;
    setAdminToken(savedToken);
    setBackendUrl(savedUrl);
  }, []);

  async function loadStatus() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/backend-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, backendUrl: normalizedBackendUrl }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(null);
        setMessage(payload.detail ?? payload.error ?? "Backend status request failed.");
        return;
      }
      setStatus(payload as AdminStatus);
      await loadMailLogs();
      window.localStorage.setItem("leadspipeline_admin_token", adminToken);
      window.localStorage.setItem("leadspipeline_backend_url", normalizedBackendUrl);
      setMessage("Backend status loaded.");
    } catch (error) {
      setStatus(null);
      setMessage(error instanceof Error ? error.message : "Backend status request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMailLogs() {
    const response = await fetch("/api/admin/mail-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMailLogs([]);
      setMailUsers([]);
      setMessage(payload.error ?? "Mail logs request failed.");
      return;
    }
    setMailLogs(payload.logs ?? []);
    setMailUsers(payload.users ?? []);
  }

  async function sendTestMail() {
    if (!testEmail.trim()) {
      setMessage("Enter a test recipient email first.");
      return;
    }

    setTestLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminToken,
          backendUrl: normalizedBackendUrl,
          to: testEmail,
          subject: "LeadsPipeline backend admin test",
          body: "This is a test email from the LeadsPipeline backend admin dashboard.",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok ? "Test email sent." : payload.detail ?? payload.error ?? "Test email failed.");
      await loadMailLogs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test email failed.");
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#171717] sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 border-b border-black/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#1f6f5b]">Backend Admin</p>
            <h1 className="mt-1 text-3xl font-semibold">LeadsPipeline Control Panel</h1>
          </div>
          <a className="h-10 rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold" href="/">
            Public homepage
          </a>
        </div>

        <section className="mb-4 grid gap-3 rounded-md border border-black/10 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm font-medium">
            Backend URL
            <input
              className="mt-1 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]"
              onChange={(event) => setBackendUrl(event.target.value)}
              value={backendUrl}
            />
          </label>
          <label className="block text-sm font-medium">
            Admin token
            <input
              className="mt-1 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]"
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="ADMIN_TOKEN"
              type="password"
              value={adminToken}
            />
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-md bg-[#101418] px-4 font-semibold text-white" disabled={loading} onClick={loadStatus} type="button">
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
            Refresh
          </button>
        </section>

        {message && <p className="mb-4 rounded-md border border-black/10 bg-white p-3 text-sm font-medium">{message}</p>}

        <section className="grid gap-4 lg:grid-cols-4">
          <StatusCard Icon={Server} label="Backend" ok={status?.status === "ok"} value={status?.status ?? "Unknown"} />
          <StatusCard Icon={Mail} label="Mail" ok={Boolean(status?.mail.configured)} value={status?.mail.provider ?? "Unknown"} />
          <StatusCard Icon={Activity} label="Groq AI" ok={Boolean(status?.groq.configured)} value={status?.groq.model ?? "Unknown"} />
          <StatusCard Icon={Shield} label="Admin token" ok={Boolean(status?.adminTokenConfigured)} value={status?.adminTokenConfigured ? "Configured" : "Not set"} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Backend configuration</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoRow label="Service" value={status?.service ?? "-"} />
              <InfoRow label="SMTP from" value={status?.mail.smtpFrom ?? "-"} />
              <InfoRow label="SMTP host" value={status?.mail.smtpHost ?? "-"} />
              <InfoRow label="SMTP port" value={status?.mail.smtpPort ?? "-"} />
              <InfoRow label="SMTP secure" value={status?.mail.smtpSecure ?? "-"} />
              <InfoRow label="Allowed origins" value={status?.allowedOrigins?.join(", ") || "-"} />
            </div>
          </div>

          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">SMTP test</h2>
            <label className="block text-sm font-medium">
              Recipient email
              <input
                className="mt-1 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]"
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={testEmail}
              />
            </label>
            <button className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1f6f5b] font-semibold text-white" disabled={testLoading} onClick={sendTestMail} type="button">
              <Mail size={16} />
              {testLoading ? "Sending..." : "Send test email"}
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Mail activity</h2>
              <p className="text-sm text-[#65605a]">User-wise sent mail count and latest backend send responses.</p>
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/15 px-4 text-sm font-semibold" onClick={loadMailLogs} type="button">
              <RefreshCw size={15} />
              Refresh logs
            </button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {mailUsers.length === 0 ? (
              <div className="rounded-md bg-[#f4f1ea] p-4 text-sm text-[#65605a]">No mail activity recorded yet.</div>
            ) : (
              mailUsers.map((user) => (
                <div className="rounded-md border border-black/10 bg-[#f4f1ea] p-4" key={user.userEmail}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-md bg-white">
                      <Users size={16} />
                    </span>
                    <p className="break-all text-sm font-semibold">{user.userEmail}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <Metric label="Total" value={user.total} />
                    <Metric label="Sent" value={user.sent} />
                    <Metric label="Failed" value={user.failed} />
                  </div>
                  <p className="mt-3 text-xs text-[#65605a]">Last: {formatDate(user.lastActivity)}</p>
                </div>
              ))
            )}
          </div>

          <div className="overflow-x-auto rounded-md border border-black/10">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f1ea] text-xs uppercase tracking-[0.12em] text-[#65605a]">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Response / error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {mailLogs.length === 0 ? (
                  <tr>
                    <td className="p-4 text-[#65605a]" colSpan={6}>
                      No mail records yet.
                    </td>
                  </tr>
                ) : (
                  mailLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-3 align-top text-[#65605a]">{formatDate(log.sentAt || log.createdAt)}</td>
                      <td className="break-all p-3 align-top">{log.userEmail}</td>
                      <td className="break-all p-3 align-top">{log.recipientEmail}</td>
                      <td className="p-3 align-top font-medium">{log.subject}</td>
                      <td className="p-3 align-top">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${log.status === "sent" ? "bg-[#dcebe6] text-[#1f6f5b]" : "bg-red-50 text-red-700"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="max-w-md p-3 align-top text-xs text-[#65605a]">
                        {log.errorMessage || log.backendResponse || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ Icon, label, ok, value }: { Icon: typeof Server; label: string; ok: boolean; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-md bg-[#f4f1ea]">
          <Icon size={18} />
        </span>
        {ok ? <CheckCircle2 className="text-[#1f6f5b]" size={20} /> : <XCircle className="text-red-600" size={20} />}
      </div>
      <p className="text-sm text-[#65605a]">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f4f1ea] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#65605a]">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white p-2">
      <p className="font-semibold">{value}</p>
      <p className="text-xs text-[#65605a]">{label}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
