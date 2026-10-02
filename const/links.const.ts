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

/** Canonical main website (marketing site) — navbar/footer links point here. */
export const MAIN_SITE_URL = "https://www.hkbprotection.co.tz";

/**
 * Recruitment line(s) shown on the job poster / application page (/jobs).
 * Display-formatted local numbers; index 0 is the primary line.
 */
export const RECRUITMENT_PHONES = ["0756006679"];

/** `tel:` hrefs for RECRUITMENT_PHONES — e.g. tel:+255756006679 */
export const RECRUITMENT_PHONE_TELS: string[] = RECRUITMENT_PHONES.map(
  (phone) => `tel:+255${phone.replace(/\D/g, "").replace(/^0/, "")}`
);

/** Postal address for walk-in applications (also shown on the poster). */
export const OFFICE_ADDRESS = "S.L.P. 42500, Temeke – Dar es Salaam";

/**
 * Google Maps pin for the head office — same location as the "Get Directions"
 * link on the marketing site's Contact Us page (/contacts).
 */
export const OFFICE_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=HKB+Protection+%26+Management+Temeke+Dar+es+Salaam";

/**
 * Build an absolute URL on the main website.
 * mainSite()            → https://www.hkbprotection.co.tz
 * mainSite("/contacts") → https://www.hkbprotection.co.tz/contacts
 * mainSite("/#services")→ https://www.hkbprotection.co.tz/#services
 */
export const mainSite = (path = "/"): string =>
  `${MAIN_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;