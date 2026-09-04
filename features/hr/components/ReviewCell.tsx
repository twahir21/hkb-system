"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  approveOrRejectTransfer,
  type ActionState,
} from "@/modules/hr/actions/transfers.actions";

export function ReviewCell({ requestId }: { requestId: string }) {
  const [action, setAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    approveOrRejectTransfer,
    { ok: false }
  );

  return (
    <form action={formAction} className="flex w-44 flex-col gap-1.5">
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="action" value={action} />

      <div className="flex overflow-hidden rounded-lg border border-slate-300">
        <button
          type="button"
          onClick={() => setAction("APPROVE")}
          className={
            "flex-1 px-3 py-1.5 text-xs font-semibold " +
            (action === "APPROVE"
              ? "bg-emerald-600 text-white"
              : "bg-white text-emerald-700 hover:bg-emerald-50")
          }
        >
          <Check className="mr-1 inline h-3" /> Approve
        </button>
        <button
          type="button"
          onClick={() => setAction("REJECT")}
          className={
            "flex-1 border-l border-slate-300 px-3 py-1.5 text-xs font-semibold " +
            (action === "REJECT"
              ? "bg-rose-600 text-white"
              : "bg-white text-rose-700 hover:bg-rose-50")
          }
        >
          <X className="mr-1 inline h-3" /> Reject
        </button>
      </div>

      <input
        name="reviewerNotes"
        placeholder="Reviewer notes (optional)"
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Processing…" : "Submit decision"}
      </Button>
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
    </form>
  );
}