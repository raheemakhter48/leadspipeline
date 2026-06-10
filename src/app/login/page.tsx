"use client";

import { KeyRound, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import type { AuthMode } from "@/components/AuthScreen";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");

    const endpoint = authMode === "login" ? "/api/auth/login" : authMode === "signup" ? "/api/auth/signup" : authMode === "otp" ? "/api/auth/verify-otp" : "/api/auth/forgot";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: otpCode, email, name, password }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Authentication failed.");
      return;
    }

    if (authMode === "forgot") {
      setStatus(`Reset request created. ${payload.resetUrl ?? ""}`);
      return;
    }

    window.localStorage.setItem("leadspipeline_user", JSON.stringify(payload.user));
    router.push("/");
  }

  async function requestOtp() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "OTP request failed.");
      return;
    }

    setStatus(payload.devCode ? `${payload.message} Code: ${payload.devCode}` : payload.message);
  }

  async function googleSignup() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/google/connect");
      const payload = await response.json();
      if (!response.ok || !payload.authUrl) {
        setError(payload.error ?? "Google signup is not configured.");
        return;
      }
      window.location.href = payload.authUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f4f1ea] text-[#171717] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-[#101418] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLogo />
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#18bf8b]">Workspace access</p>
          <h1 className="text-5xl font-semibold leading-tight">Login to manage leads, campaigns, and outreach.</h1>
          <p className="mt-5 text-lg leading-7 text-white/70">Access your saved contacts, ready-to-buy lead engine, AI intel, and SMTP-powered message queue.</p>
        </div>
        <a className="text-sm text-white/60 hover:text-white" href="/">
          Back to homepage
        </a>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-6">
        <form className="w-full max-w-md rounded-md border border-black/10 bg-white p-6 shadow-sm" onSubmit={submitAuth}>
          <div className="mb-6">
            <a className="mb-5 inline-block text-sm font-medium text-[#1f6f5b] lg:hidden" href="/">
              Back to homepage
            </a>
            <p className="text-sm font-medium text-[#65605a]">
              {authMode === "login" ? "Welcome back" : authMode === "signup" ? "Create workspace" : authMode === "otp" ? "Email OTP" : "Recover account"}
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              {authMode === "login" ? "Login" : authMode === "signup" ? "Sign up" : authMode === "otp" ? "Login with OTP" : "Forgot password"}
            </h2>
          </div>

          {authMode === "signup" && <AuthField Icon={User} label="Name" onChange={setName} placeholder="Your name" type="text" value={name} />}
          <AuthField Icon={Mail} label="Email" onChange={setEmail} placeholder="you@company.com" type="email" value={email} />
          {authMode !== "forgot" && authMode !== "otp" && <AuthField Icon={Lock} label="Password" onChange={setPassword} placeholder="Minimum 8 characters" type="password" value={password} />}
          {authMode === "otp" && (
            <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <AuthField Icon={KeyRound} label="OTP code" onChange={setOtpCode} placeholder="6-digit code" type="text" value={otpCode} />
              <button className="mt-6 h-11 rounded-md border border-black/15 px-3 text-sm font-medium" disabled={loading || !email} onClick={requestOtp} type="button">
                Send OTP
              </button>
            </div>
          )}

          {error && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {status && <p className="mb-3 rounded-md bg-[#dcebe6] p-3 text-sm text-[#1f6f5b]">{status}</p>}

          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white disabled:opacity-60" disabled={loading} type="submit">
            {loading ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <KeyRound size={16} />}
            {authMode === "login" ? "Login" : authMode === "signup" ? "Create account" : authMode === "otp" ? "Verify OTP" : "Send reset link"}
          </button>

          {authMode !== "forgot" && authMode !== "otp" && (
            <button className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-black/15 font-medium" onClick={googleSignup} type="button">
              <span className="grid size-5 place-items-center rounded-full bg-white text-sm font-semibold text-[#233f91]">G</span>
              Continue with Google
            </button>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            {authMode !== "login" ? (
              <button className="text-[#1f6f5b]" onClick={() => setAuthMode("login")} type="button">
                Back to login
              </button>
            ) : (
              <button className="text-[#1f6f5b]" onClick={() => setAuthMode("forgot")} type="button">
                Forgot password?
              </button>
            )}
            {authMode !== "otp" && (
              <button className="text-[#1f6f5b]" onClick={() => setAuthMode("otp")} type="button">
                Login with OTP
              </button>
            )}
            {authMode !== "signup" && (
              <button className="font-medium text-[#1f6f5b]" onClick={() => setAuthMode("signup")} type="button">
                Create account
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function AuthField({
  Icon,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  Icon: typeof Mail;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  return (
    <label className="mb-3 block text-sm font-medium">
      {label}
      <span className="mt-1 flex h-11 items-center gap-2 rounded-md border border-black/15 px-3 focus-within:border-[#1f6f5b]">
        <Icon size={16} className="text-[#65605a]" />
        <input className="h-full min-w-0 flex-1 outline-none" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
      </span>
    </label>
  );
}
