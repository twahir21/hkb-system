const TZ = "Africa/Dar_es_Salaam";

/** e.g. "Jumanne, 18/11/2026" in EAT. */
export function meetingDate(d: Date): string {
  return d.toLocaleDateString("sw-TZ", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** e.g. "14:30" in EAT. */
export function meetingTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** "14:30 – 16:00" (or just the start). */
export function meetingTimeRange(start: Date, end: Date | null): string {
  return end ? `${meetingTime(start)} – ${meetingTime(end)}` : meetingTime(start);
}

/** Has the meeting ended? (No end time = assume 2 hours, same as the list query.) */
export function meetingHasEnded(start: Date, end: Date | null, now = Date.now()): boolean {
  return (end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000)).getTime() < now;
}
