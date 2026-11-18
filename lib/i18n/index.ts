import { sw, type Dictionary } from "./sw";

/** Active UI dictionary. Swahili is the default (and currently only) language. */
export const t: Dictionary = sw;
export const LOCALE = "sw" as const;

/** Swahili label for an enum value (status, shift, absence…); unknown values pass through. */
export function enumLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (t.status as Record<string, string>)[value] ?? value;
}
