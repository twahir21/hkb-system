"use client";

import { useActionState, useState } from "react";
import { PenLine, CheckCircle2, AlertCircle } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { updateStaffTimes } from "@/features/staff-attendance/actions/staff-attendance.actions";

/**
 * Super Admin-only modal for editing the recorded check-in / sign-out times
 * of an existing staff attendance log.
 */
export function StaffEditTimeModal({
  userId,
  userName,
  date,
  currentCheckInTime,
  currentCheckOutTime,
}: {
  userId: string;
  userName: string;
  date: string;
  currentCheckInTime?: string | null;
  currentCheckOutTime?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string>(currentCheckInTime || "");
  const [checkOutTime, setCheckOutTime] = useState<string>(currentCheckOutTime || "");
  const [state, formAction, pending] = useActionState(updateStaffTimes, {
    ok: false,
  });

  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Edit check-in / sign-out times (Super Admin)"
        className="text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 px-2"
      >
        <PenLine className="h-3.5 w-3.5" />
      </Button>

      <Modal open={open} onClose={close} title={`Edit Times — ${userName}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="date" value={date} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Check-in Time
              </label>
              <input
                type="text"
                name="checkInTime"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="e.g. 08:00 AM"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Sign-out Time
              </label>
              <input
                type="text"
                name="checkOutTime"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder="e.g. 05:00 PM"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Leave a field empty to clear the recorded time. Every change is
            audit-logged.
          </p>

          {state.error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {state.ok && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{state.message || "Times updated."}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Times"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
