"use client";

import { t } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { FileDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui";

type SupervisorOpt = { id: string; name: string; role: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function ReportBuilder({ supervisors }: { supervisors: SupervisorOpt[] }) {
  const [startDate, setStartDate] = useState(daysAgo(7));
  const [endDate, setEndDate] = useState(todayISO());
  const [supervisorId, setSupervisorId] = useState("");
  const [shift, setShift] = useState("");

  const url = useMemo(() => {
    const p = new URLSearchParams({
      startDate,
      endDate,
      format: "pdf",
    });
    if (supervisorId) p.set("supervisorId", supervisorId);
    if (shift) p.set("shift", shift);
    return `/api/reports/pdf?${p.toString()}`;
  }, [startDate, endDate, supervisorId, shift]);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t.rb.params}</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.rb.startDate}
            </span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.rb.endDate}
            </span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.reportsPage.supervisor}
            </span>
            <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className={inputCls}>
              <option value="">{t.msv.allSupervisors}</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({t.roles[s.role as keyof typeof t.roles] ?? s.role})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.records.shift}
            </span>
            <select value={shift} onChange={(e) => setShift(e.target.value)} className={inputCls}>
              <option value="">{t.rb.bothShifts}</option>
              <option value="DAY">{t.status.DAY}</option>
              <option value="NIGHT">{t.status.NIGHT}</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <a href={url} download>
            <Button>
              <FileDown className="h-4 w-4" /> {t.rb.generate}
            </Button>
          </a>
          <span className="text-xs text-slate-400">
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            {startDate} → {endDate}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t.common.notes}</h3>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>• {t.rb.note1}</li>
          <li>• {t.rb.note2}</li>
          <li>
            • {t.rb.note3a}{" "}
            <span className="font-semibold text-rose-600">{t.status.NOT_PERMITTED.toUpperCase()}</span>{" "}
            {t.rb.note3b}
          </li>
        </ul>
      </div>
    </div>
  );
}