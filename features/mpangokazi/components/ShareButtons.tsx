"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";

/**
 * Download the PDF, or share it through the phone's share sheet
 * (WhatsApp office group, email, ...). Falls back to download where
 * file sharing is not supported (most desktop browsers).
 */
export function ShareButtons({ id, fileLabel }: { id: string; fileLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/mpangokazi/${id}/pdf`;

  const share = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Imeshindikana kupata PDF.");
      const blob = await res.blob();
      const file = new File([blob], `mpangokazi-${fileLabel}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Fomu ya Mpangokazi ${fileLabel}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
        setError("Kifaa hiki hakiwezi kushiriki moja kwa moja — PDF imepakuliwa, ituma kwenye kikundi.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <a
          href={url}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </a>
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <Share2 className="h-3.5 w-3.5" /> {busy ? "Inaandaa…" : "Shiriki"}
        </button>
      </div>
      {error && <p className="max-w-xs text-right text-[11px] text-amber-700">{error}</p>}
    </div>
  );
}
