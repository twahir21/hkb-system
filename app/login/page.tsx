"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ShieldCheck, CalendarClock, FileText, Fingerprint } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 shadow-xl lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold">
              HKB
            </div>
            <h2 className="mt-6 text-2xl font-bold leading-tight">
              HKB Protection &amp; Management Co.
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Shift-based attendance, leave processing and payroll reporting — unified.
            </p>
          </div>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-brand-400" /> Role-based access for every team
            </li>
            <li className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-brand-400" /> Per-shift (Day/Night) clock-in
            </li>
            <li className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-400" /> Strict PDF reports &amp; payroll
            </li>
            <li className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-brand-400" /> Google OAuth for all accounts
            </li>
          </ul>
        </div>

        {/* Sign-in card */}
        <div className="flex flex-col justify-center p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Welcome back
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Sign in to continue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your company Google account to access the system.
          </p>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2 4.1-3.6 5.6l6.2 5.2C41.7 35.1 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Sign in with Google
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">
            Access is restricted to authorized employees of HKB Protection &amp; Management Co.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}