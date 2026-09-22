"use client";

import { useState } from "react";
import {
  Printer,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Network,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const PRINT_URL = "http://192.168.1.120:8686/send";
const PRINT_CODE = "hkb-print-2026";

export function AutoPrintModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PRINT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers / non-https if needed
      const textArea = document.createElement("textarea");
      textArea.value = PRINT_CODE;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenPrintPortal = () => {
    // Also copy code automatically for convenience
    navigator.clipboard?.writeText?.(PRINT_CODE).catch(() => {});
    window.open(PRINT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Printer className="h-4 w-4" />
          </div>
          <span>HKB Direct Auto Print</span>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Network Instruction Card */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Wifi className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-amber-950">
                HQ Office Wi-Fi Required
              </p>
              <p className="text-amber-900/90 leading-relaxed text-xs sm:text-sm">
                Make sure you are connected to the <strong>Wi-Fi of HKB HQ office</strong> to print direct to printer in private internet.
              </p>
            </div>
          </div>
        </div>

        {/* Code Card - Tap to Copy */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Printer Passcode
            </span>
            <span className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
              Tap code to copy
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy printer passcode"
            className="group w-full flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 shadow-xs transition-all hover:border-brand-500 hover:bg-brand-50/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
              <div className="text-left">
                <code className="font-mono text-base sm:text-lg font-bold tracking-wider text-slate-900 group-hover:text-brand-700">
                  {PRINT_CODE}
                </code>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors bg-slate-100 text-slate-700 group-hover:bg-brand-100 group-hover:text-brand-800">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Tap to copy</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Private network status notice */}
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Private Network Gateway: <code className="font-mono text-[11px] text-slate-700 font-semibold">192.168.1.120:8686</code></span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleOpenPrintPortal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-700 active:scale-[0.99]"
          >
            <Printer className="h-4 w-4" />
            <span>Open Auto Print</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function AutoPrintButton({
  variant = "topbar",
  className = "",
  onOpen,
}: {
  variant?: "topbar" | "sidebar" | "mobile";
  className?: string;
  onOpen?: () => void;
}) {
  const handleClick = () => {
    if (onOpen) {
      onOpen();
    }
  };

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-800 ${className}`}
      >
        <Printer className="h-4 w-4 text-brand-600" />
        <span>Auto Print (HQ)</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Open Auto Print instructions and portal"
      className={`inline-flex h-9 items-center gap-2 rounded-lg border border-brand-300 bg-brand-50/70 px-3 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-100 hover:text-brand-900 active:scale-[0.98] ${className}`}
    >
      <Printer className="h-4 w-4 text-brand-600" />
      <span className="font-semibold">Auto Print</span>
    </button>
  );
}
