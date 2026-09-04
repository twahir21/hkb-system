import { cn } from "@/lib/utils";

type Tone = "emerald" | "amber" | "rose" | "slate" | "brand" | "violet";

const tones: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Map attendance status/absence categories to badge tones. */
export function statusTone(
  value: string | null | undefined
): Tone {
  switch (value) {
    case "PRESENT":
    case "APPROVED":
      return "emerald";
    case "LATE":
      return "amber";
    case "ABSENT":
    case "NOT_PERMITTED":
    case "REJECTED":
      return "rose";
    case "PERMITTED_REASON":
    case "PENDING":
      return "amber";
    case "SICK":
      return "brand";
    default:
      return "slate";
  }
}