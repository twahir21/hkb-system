import { sw, type Dictionary } from "./sw";

/** Active UI dictionary. Swahili is the default (and currently only) language. */
export const t: Dictionary = sw;
export const LOCALE = "sw" as const;
