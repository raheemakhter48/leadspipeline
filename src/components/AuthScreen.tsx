import { Mail, Lock, User, KeyRound } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import type { AuthUser } from "@/lib/auth-db";
import type { FormEvent } from "react";

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
  return (
    <main className="grid min-h-screen bg-[#f4f1ea] text-[#171717] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between bg-[#101418] p-6 text-white sm:p-8 lg:min-h-screen">
        <BrandLogo />
        <div className="max-w-xl py-10 lg:py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#18bf8b]">LeadsPipeline</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">Build lead lists, campaigns, and outreach from one workspace.</h1>
          <p className="mt-5 text-base text-white/70 sm:text-lg">Sign in to manage real leads, saved contacts, campaign drafts, and Gmail-powered outreach.</p>
        </div>
        <p className="text-sm text-white/50">AI lead generation workspace</p>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-6 lg:min-h-screen">
        <form className="w-full max-w-md rounded-md border border-black/10 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
          <div className="mb-6">
            <p className="text-sm font-medium text-[#65605a]">
              {authMode === "login" ? "Welcome back" : authMode === "signup" ? "Create workspace" : authMode === "otp" ? "Email OTP" : "Recover account"}
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              {authMode === "login" ? "Login" : authMode === "signup" ? "Sign up" : authMode === "otp" ? "Login with OTP" : "Forgot password"}
            </h2>
          </div>

          {authMode === "signup" && (
            <AuthField Icon={User} label="Name" onChange={setName} placeholder="Your name" type="text" value={name} />
          )}
          <AuthField Icon={Mail} label="Email" onChange={setEmail} placeholder="you@company.com" type="email" value={email} />
          {authMode !== "forgot" && authMode !== "otp" && (
            <AuthField Icon={Lock} label="Password" onChange={setPassword} placeholder="Minimum 8 characters" type="password" value={password} />
          )}
          {authMode === "otp" && (
            <>
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <AuthField Icon={KeyRound} label="OTP code" onChange={setOtpCode} placeholder="6-digit code" type="text" value={otpCode} />
                <button className="mt-6 h-11 rounded-md border border-black/15 px-3 text-sm font-medium" disabled={authLoading || !email} onClick={onRequestOtp} type="button">
                  Send OTP
                </button>
              </div>
            </>
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
        <input
          className="h-full min-w-0 flex-1 outline-none"
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
