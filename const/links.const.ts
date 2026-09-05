/**
 * HKB Protection & Management — canonical contact constants.
 * ------------------------------------------------------------------
 * Single source of truth for every phone number used across the site.
 * Never hardcode a phone number in a component — import PHONES or
 * PHONE_TELS from here instead.
 */

/** Display-formatted phone numbers (index 0 = primary line). */
export const PHONES = ["+255 62 600 6688", "+255 75 600 6679"];

/** `tel:` hrefs derived from PHONES — use for anchor/link targets. */
export const PHONE_TELS: string[] = PHONES.map((phone) =>
  `tel:${phone.replace(/[^\d+]/g, "")}`
);