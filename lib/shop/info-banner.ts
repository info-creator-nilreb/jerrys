/** Anzeigedauern für rotierende Info-Banner-Texte (Sekunden). */
export const INFO_BANNER_DURATIONS_SEC = [4, 5, 6, 8, 10] as const;
export type InfoBannerDurationSec = (typeof INFO_BANNER_DURATIONS_SEC)[number];

export const INFO_BANNER_MAX_MESSAGES = 3;
export const INFO_BANNER_MESSAGE_MAX_LEN = 120;

export function parseInfoBannerDurationSec(value: unknown): InfoBannerDurationSec {
  const n = typeof value === "number" ? value : Number(value);
  if ((INFO_BANNER_DURATIONS_SEC as readonly number[]).includes(n)) {
    return n as InfoBannerDurationSec;
  }
  return 6;
}

/** Prisma-JSON / Formular → max. 3 nicht-leere Kurztexte. */
export function parseInfoBannerMessages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, INFO_BANNER_MESSAGE_MAX_LEN);
    if (!t) continue;
    out.push(t);
    if (out.length >= INFO_BANNER_MAX_MESSAGES) break;
  }
  return out;
}

export function infoBannerIsVisible(options: {
  active: boolean;
  messages: readonly string[];
}): boolean {
  return options.active && options.messages.length > 0;
}
