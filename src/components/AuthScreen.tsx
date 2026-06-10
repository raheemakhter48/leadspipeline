"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  Star,
  User,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import type { AuthUser } from "@/lib/auth-db";

type AuthMode = "login" | "signup" | "forgot" | "otp";

export function AuthScreen({
  authError,
  authLoading,
  authMode,
  authStatus,
  email,
  name,
  password,
  otpCode,
  setAuthMode,
  setEmail,
  setName,
  setPassword,
  setOtpCode,
  onRequestOtp,
  onGoogle,
  onSubmit,
}: {
  authError: string;
  authLoading: boolean;
  authMode: AuthMode;
  authStatus: string;
  email: string;
  name: string;
  password: string;
  otpCode: string;
  setAuthMode: (mode: AuthMode) => void;
  setEmail: (value: string) => void;
  setName: (value: string) => void;
  setPassword: (value: string) => void;
  setOtpCode: (value: string) => void;
  onGoogle: () => void;
  onRequestOtp: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [showAuth, setShowAuth] = useState(false);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setShowAuth(true);
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#171717]">
      <section className="relative min-h-screen overflow-hidden p-4 text-white sm:p-6">
        <Image alt="LeadsPipeline workspace" className="object-cover" fill priority src="/image.png" sizes="100vw" />
        <div className="absolute inset-0 bg-[#101418]/78" />
        <div className="absolute inset-0 bg-[#1f6f5b]/35" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-32px)] max-w-7xl flex-col">
          <nav className="mx-auto mt-1 flex w-full max-w-6xl items-center justify-between gap-4 rounded-full bg-white/92 px-5 py-3 text-[#101418] shadow-xl backdrop-blur sm:px-8">
            <BrandLogo />
            <div className="hidden items-center gap-7 text-sm font-medium lg:flex">
              <a href="#features" className="text-[#1f6f5b]">Features</a>
              <a href="#workflow">Workflow</a>
              <a href="#templates">Templates</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="flex items-center gap-2">
              <a className="hidden h-10 items-center rounded-md px-3 text-sm font-semibold text-[#1f6f5b] sm:inline-flex" href="/login">
                Sign in
              </a>
              <button className="inline-flex h-10 items-center rounded-md bg-[#101418] px-4 text-sm font-semibold text-white" onClick={() => openAuth("signup")} type="button">
                Get Started
              </button>
            </div>
          </nav>

          <div className="relative grid flex-1 items-center py-12">
            <FloatingBadge className="left-4 top-20 hidden lg:grid" Icon={Search} text="Scraper" />
            <FloatingBadge className="right-16 top-28 hidden xl:grid" Icon={MessageSquareText} text="AI Intel" />
            <FloatingBadge className="bottom-24 left-20 hidden xl:grid" Icon={Send} text="SMTP" />

            <div className="mx-auto max-w-5xl text-center">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-[#18bf8b]">LeadsPipeline</p>
              <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl xl:text-7xl">
                Grow your lead pipeline with real business contacts.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/84 sm:text-lg">
                Find ready-to-buy companies, scrape public contact signals, save verified contacts, build campaigns, and send branded outreach from one AI workspace.
              </p>

              <div className="mx-auto mt-8 grid max-w-xl gap-3 rounded-full border border-white/40 bg-white/12 p-2 backdrop-blur sm:grid-cols-[1fr_auto]">
                <label className="flex min-w-0 items-center gap-3 px-4">
                  <Mail size={18} className="shrink-0 text-white/80" />
                  <input
                    className="h-11 min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/72"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                  />
                </label>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#1f6f5b]" onClick={() => openAuth("signup")} type="button">
                  Start free
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <TrustCard label="Real source leads" value="No fake fallback" />
                <TrustCard label="Email templates" value="HTML branded" />
                <TrustCard label="Backend sending" value="Your SMTP" />
              </div>
            </div>
          </div>

          <div id="features" className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeaturePill Icon={Search} title="Ready-to-buy scraper" text="Find companies from public web and open map sources without paid lead APIs." />
            <FeaturePill Icon={BarChart3} title="AI scoring" text="Rank leads by contact quality, source, website signal, and campaign fit." />
            <FeaturePill Icon={MessageSquareText} title="HTML outreach" text="Use branded email templates with plain-text fallback for deliverability." />
            <FeaturePill Icon={ShieldCheck} title="SMTP control" text="Send from your own business domain through the Oracle backend." />
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#1f6f5b]">Workflow</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">From search to sent campaign.</h2>
          <p className="mt-4 max-w-xl text-[#65605a]">
            LeadsPipeline gives your team one place to discover prospects, prepare outreach, and send messages using your configured email backend.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <WorkflowStep Icon={Globe2} title="Search real sources" text="Use public web, OpenStreetMap, and website crawling to collect businesses." />
          <WorkflowStep Icon={Database} title="Save contacts" text="Store contact-ready leads and reuse them in campaigns." />
          <WorkflowStep Icon={Zap} title="Generate intel" text="Create company-specific outreach angles with AI support." />
          <WorkflowStep Icon={Send} title="Send outreach" text="Send HTML templates through your SMTP server and track sent messages." />
        </div>
      </section>

      <section id="templates" className="bg-[#101418] px-4 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#18bf8b]">Templates</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-2xl text-3xl font-semibold sm:text-5xl">Built-in outreach templates for different campaigns.</h2>
            <p className="max-w-md text-white/68">Choose from growth, audit, local SEO, paid ads, ecommerce, booking, B2B, trust, reactivation, and partnership templates.</p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <TemplateCard title="Website Audit" text="Send useful website improvement notes with clear conversion fixes." />
            <TemplateCard title="Local SEO" text="Pitch local visibility opportunities to location-based businesses." />
            <TemplateCard title="B2B Pipeline" text="Start a professional outbound conversation with targeted companies." />
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-md bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#1f6f5b]">Get started</p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">Launch your lead workspace.</h2>
          <p className="mt-4 text-[#65605a]">
            Use the app to search ready-to-buy leads, save contacts, generate messages, and send campaigns from your configured SMTP backend.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ContactPoint text="Ready-to-buy scraper included" />
            <ContactPoint text="Oracle backend email sending" />
            <ContactPoint text="AI message tailoring" />
            <ContactPoint text="HTML campaign templates" />
          </div>
        </div>
        <div className="rounded-md border border-black/10 bg-[#dcebe6] p-6">
          <h3 className="text-2xl font-semibold">Workspace access</h3>
          <p className="mt-3 text-[#3f3b37]">Existing users can login to the workspace. New users can create an account and start from the same product flow.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#101418] px-5 text-sm font-semibold text-white" onClick={() => openAuth("login")} type="button">
              Login to workspace
              <ArrowRight size={16} />
            </button>
            <button className="inline-flex h-11 items-center justify-center rounded-md border border-black/15 bg-white px-5 text-sm font-semibold" onClick={() => openAuth("signup")} type="button">
              Create account
            </button>
          </div>
        </div>
      </section>

      {showAuth && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <form className="relative w-full max-w-md rounded-md border border-black/10 bg-white p-6 shadow-2xl" onSubmit={onSubmit}>
            <button
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-md border border-black/10 text-[#65605a]"
              onClick={() => setShowAuth(false)}
              type="button"
            >
              <X size={16} />
            </button>
            <div className="mb-6 pr-10">
              <p className="text-sm font-medium text-[#65605a]">
                {authMode === "login" ? "Welcome back" : authMode === "signup" ? "Create workspace" : authMode === "otp" ? "Email OTP" : "Recover account"}
              </p>
              <h2 className="mt-1 text-3xl font-semibold">
                {authMode === "login" ? "Login" : authMode === "signup" ? "Sign up" : authMode === "otp" ? "Login with OTP" : "Forgot password"}
              </h2>
            </div>

            {authMode === "signup" && <AuthField Icon={User} label="Name" onChange={setName} placeholder="Your name" type="text" value={name} />}
            <AuthField Icon={Mail} label="Email" onChange={setEmail} placeholder="you@company.com" type="email" value={email} />
            {authMode !== "forgot" && authMode !== "otp" && (
              <AuthField Icon={Lock} label="Password" onChange={setPassword} placeholder="Minimum 8 characters" type="password" value={password} />
            )}
            {authMode === "otp" && (
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <AuthField Icon={KeyRound} label="OTP code" onChange={setOtpCode} placeholder="6-digit code" type="text" value={otpCode} />
                <button className="mt-6 h-11 rounded-md border border-black/15 px-3 text-sm font-medium" disabled={authLoading || !email} onClick={onRequestOtp} type="button">
                  Send OTP
                </button>
              </div>
            )}

            {authError && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{authError}</p>}
            {authStatus && <p className="mb-3 rounded-md bg-[#dcebe6] p-3 text-sm text-[#1f6f5b]">{authStatus}</p>}

            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#101418] font-medium text-white disabled:opacity-60" disabled={authLoading} type="submit">
              {authLoading ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <KeyRound size={16} />}
              {authMode === "login" ? "Login" : authMode === "signup" ? "Create account" : authMode === "otp" ? "Verify OTP" : "Send reset link"}
            </button>

            {authMode !== "forgot" && authMode !== "otp" && (
              <button className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-black/15 font-medium" onClick={onGoogle} type="button">
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
        </div>
      )}
    </main>
  );
}

function FloatingBadge({ Icon, className, text }: { Icon: LucideIcon; className: string; text: string }) {
  return (
    <div className={`absolute size-24 place-items-center rounded-full border border-white/40 bg-white/18 text-center shadow-xl backdrop-blur ${className}`}>
      <Icon size={28} className="text-[#18bf8b]" />
      <span className="mt-1 text-xs font-semibold">{text}</span>
    </div>
  );
}

function TrustCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/18 px-4 py-3 text-left shadow-lg backdrop-blur">
      <div className="mb-1 flex gap-1 text-[#ffd84d]">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={14} fill="currentColor" />
        ))}
      </div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-white/72">{value}</p>
    </div>
  );
}

function FeaturePill({ Icon, text, title }: { Icon: LucideIcon; text: string; title: string }) {
  return (
    <div className="rounded-md border border-white/16 bg-white/12 p-4 shadow-xl backdrop-blur">
      <div className="mb-3 grid size-9 place-items-center rounded-md bg-white/18 text-[#18bf8b]">
        <Icon size={17} />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/72">{text}</p>
    </div>
  );
}

function WorkflowStep({ Icon, text, title }: { Icon: LucideIcon; text: string; title: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4 grid size-10 place-items-center rounded-md bg-[#dcebe6] text-[#1f6f5b]">
        <Icon size={18} />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#65605a]">{text}</p>
    </div>
  );
}

function TemplateCard({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.06] p-5">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/68">{text}</p>
    </div>
  );
}

function ContactPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-[#f4f1ea] p-3 text-sm font-medium">
      <CheckCircle2 size={16} className="text-[#1f6f5b]" />
      {text}
    </div>
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
  Icon: LucideIcon;
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
        <input
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}

export type { AuthMode, AuthUser };
