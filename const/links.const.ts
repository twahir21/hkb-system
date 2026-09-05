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
 * Build an absolute URL on the main website.
 * mainSite()            → https://www.hkbprotection.co.tz
 * mainSite("/contacts") → https://www.hkbprotection.co.tz/contacts
 * mainSite("/#services")→ https://www.hkbprotection.co.tz/#services
 */
export const mainSite = (path = "/"): string =>
  `${MAIN_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;