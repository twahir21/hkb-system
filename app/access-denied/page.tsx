"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldAlert,
  Mail,
  ArrowLeft,
  Copy,
  Check,
  Building2,
} from "lucide-react";

const SUPPORT_EMAIL = "info@hkbprotection.co.tz";

function AccessDeniedContent() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "HKB Attendance Portal — Access Request"
  )}&body=${encodeURIComponent(
    "Hello HKB IT & Technical Department,\n\nI am requesting access to the HKB Attendance Management Portal.\n\nMy Details:\n• Full Name: \n• Employee ID: \n• Email: \n• Role (Guard/Supervisor/HR/Bursar): \n• Work Location / Post: \n\nThank you."
  )}`;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-amber-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
        {/* Top Header & Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-brand-500/40 bg-slate-950 p-1.5 shadow-xl shadow-brand-500/10">
              <Image
                src="/logo.jpg"
                alt="HKB Protection & Management"
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-full bg-rose-500 p-1.5 text-white shadow-lg">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
            Access Restricted &bull; Unregistered User
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Unauthorized Portal Access
          </h1>

          <p className="mt-3 max-w-lg text-sm text-slate-400 leading-relaxed">
            Access to the <strong className="text-slate-200">HKB Attendance System</strong> is strictly
            restricted to authorized personnel registered by a Super Administrator. Your account is
            not currently provisioned in the system.
          </p>
        </div>

        {/* Assistance & Contact Card */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                Contact HKB IT &amp; Technical Department
              </h2>
              <p className="text-xs text-slate-400">
                Authorized registration &amp; account provisioning support
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <p className="leading-relaxed">
              If you are an active employee, guard, supervisor, or staff member of HKB Protection &amp;
              Management Co., please contact the technical department to have your account registered.
            </p>

            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <Mail className="h-4 w-4 shrink-0 text-brand-400" />
                <span className="font-mono text-xs text-slate-200 truncate">{SUPPORT_EMAIL}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Email
                  </>
                )}
              </button>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-3 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Please include in your request:</span>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Your Full Official Name &amp; Employee ID</li>
                <li>Designated Role (e.g., Guard, Supervisor, HR, Bursar)</li>
                <li>Assigned Work Location / Station</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={mailtoLink}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <Mail className="h-4 w-4" />
              Email IT Department
            </a>
            <Link
              href="/login"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-8 text-center text-[11px] text-slate-500">
          HKB Protection &amp; Management Co. &bull; Internal Security Protocol &bull; All unauthorized access attempts are logged.
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense>
      <AccessDeniedContent />
    </Suspense>
  );
}
