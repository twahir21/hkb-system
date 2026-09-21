"use client";

import { useActionState, useState } from "react";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { markStaffAttendance } from "@/features/staff-attendance/actions/staff-attendance.actions";

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120];

export function StaffLateModal({
  userId,
  userName,
  date,
  currentMinutesLate,
  currentReason,
  currentCheckInTime,
}: {
  userId: string;
  userName: string;
  date: string;
  currentMinutesLate?: number | null;
  currentReason?: string | null;
  currentCheckInTime?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [minutesLate, setMinutesLate] = useState<number>(
    currentMinutesLate || 15,
  );
  const [checkInTime, setCheckInTime] = useState<string>(
    currentCheckInTime ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  const [reason, setReason] = useState<string>(currentReason || "");
  const [state, formAction, pending] = useActionState(markStaffAttendance, {
    ok: false,
  });

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
      >
        <Clock className="h-3.5 w-3.5 text-amber-600 mr-1" />
        Late
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={`Mark Late Arrival — ${userName}`}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="status" value="LATE" />

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick Delay Selection
            </span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PRESET_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutesLate(m)}
                  className={
                    "rounded-xl border py-2 text-center text-xs font-bold transition " +
                    (minutesLate === m
                      ? "border-amber-500 bg-amber-100 text-amber-900 ring-1 ring-amber-500"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                  }
                >
                  +{m}m
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Minutes Late
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="minutesLate"
                  min={1}
                  max={720}
                  value={minutesLate}
                  onChange={(e) =>
                    setMinutesLate(Math.max(1, Number(e.target.value) || 1))
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-medium text-slate-400">
                  minutes
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Check-in Time
              </label>
              <input
                type="text"
                name="checkInTime"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="e.g. 08:45 AM"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
              Reason / Notes (optional)
            </label>
            <textarea
              name="reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Traffic delays, urgent family stop..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {state.error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {state.ok && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{state.message || "Late arrival recorded."}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="submit"
              disabled={pending}
              className="bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500"
            >
              {pending ? "Saving..." : "Confirm Late Arrival"}
            </Button>
          </div>

        </form>
      </Modal>
    </>
  );
}
