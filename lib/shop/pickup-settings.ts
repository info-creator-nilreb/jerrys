import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";

export const DEFAULT_PICKUP_READY_TEXT = "Gewöhnlich fertig in 24 Stunden";

export type PickupDisplayCopy = {
  storeLabel: string;
  readyText: string;
  infoUrl: string | null;
};

/** Anzeige-Texte für den Abhol-Hinweis auf der PDP (Shop-weit). */
export function resolvePickupDisplayCopy(settings: ShopSettingsDTO): PickupDisplayCopy {
  const city = settings.addressCity?.trim();
  const storeLabel =
    settings.pickupStoreLabel?.trim() ||
    (city ? `Store in ${city}` : "Store vor Ort");
  const readyText = settings.pickupReadyText?.trim() || DEFAULT_PICKUP_READY_TEXT;
  const infoUrl = settings.pickupInfoUrl?.trim() || null;
  return { storeLabel, readyText, infoUrl };
}

export function parsePickupStoreLabel(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t === "" ? null : t.slice(0, 80);
}

export function parsePickupReadyText(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t === "" ? null : t.slice(0, 120);
}

export function parsePickupInfoUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (t === "") return null;
  if (t.startsWith("/")) return t.slice(0, 500);
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString().slice(0, 500);
  } catch {
    return null;
  }
  return null;
}
