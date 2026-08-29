export const DEFAULT_PICKUP_READY_HOURS = 24;

export type PickupStoreRecord = {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
  infoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type PickupDisplayCopy = {
  store: PickupStoreRecord;
  readyText: string;
  formattedAddress: string;
  mapsUrl: string;
  storeHref: string;
};

export function formatPickupStoreAddress(store: PickupStoreRecord): string {
  const cityLine = `${store.zip} ${store.city}`.trim();
  return [store.line1, store.line2, cityLine, store.country].filter(Boolean).join(", ");
}

export function googleMapsUrlForPickupStore(store: PickupStoreRecord): string {
  const query = formatPickupStoreAddress(store);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function resolvePickupStoreHref(store: PickupStoreRecord): string {
  const info = store.infoUrl?.trim();
  if (info) {
    if (info.startsWith("/")) return info;
    try {
      const u = new URL(info);
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch {
      /* fallback maps */
    }
  }
  return googleMapsUrlForPickupStore(store);
}

/** Menschenlesbarer Fertigstellungs-Hinweis aus Stunden (Default 24). */
export function formatPickupReadyText(hours: number): string {
  const h = Math.max(1, Math.min(168, Math.round(hours)));
  if (h === 24) return "Gewöhnlich fertig in 24 Stunden";
  if (h < 24) return `Gewöhnlich fertig in ${h} Stunden`;
  const days = Math.round(h / 24);
  return days === 1 ? "Gewöhnlich fertig in 1 Tag" : `Gewöhnlich fertig in ${days} Tagen`;
}

export function resolvePickupDisplayCopy(
  store: PickupStoreRecord,
  readyHours: number | null | undefined,
): PickupDisplayCopy {
  const hours = readyHours ?? DEFAULT_PICKUP_READY_HOURS;
  return {
    store,
    readyText: formatPickupReadyText(hours),
    formattedAddress: formatPickupStoreAddress(store),
    mapsUrl: googleMapsUrlForPickupStore(store),
    storeHref: resolvePickupStoreHref(store),
  };
}

export function parsePickupReadyHours(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 168) return null;
  return n;
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

export type PickupStoreFormRow = {
  id?: string;
  name: string;
  line1: string;
  line2: string;
  zip: string;
  city: string;
  country: string;
  infoUrl: string;
  isActive: boolean;
};

export function pickupStoresFromFormData(formData: FormData): PickupStoreFormRow[] {
  const ids = formData.getAll("pickupStoreId").map((v) => String(v ?? "").trim());
  const names = formData.getAll("pickupStoreName").map((v) => String(v ?? "").trim());
  const line1s = formData.getAll("pickupStoreLine1").map((v) => String(v ?? "").trim());
  const line2s = formData.getAll("pickupStoreLine2").map((v) => String(v ?? "").trim());
  const zips = formData.getAll("pickupStoreZip").map((v) => String(v ?? "").trim());
  const cities = formData.getAll("pickupStoreCity").map((v) => String(v ?? "").trim());
  const countries = formData.getAll("pickupStoreCountry").map((v) => String(v ?? "").trim().toUpperCase());
  const infoUrls = formData.getAll("pickupStoreInfoUrl").map((v) => String(v ?? "").trim());
  const activeFlags = formData.getAll("pickupStoreActive").map((v) => String(v ?? ""));

  const len = Math.max(
    ids.length,
    names.length,
    line1s.length,
    line2s.length,
    zips.length,
    cities.length,
    countries.length,
    infoUrls.length,
    activeFlags.length,
  );

  const rows: PickupStoreFormRow[] = [];
  for (let i = 0; i < len; i++) {
    const name = names[i] ?? "";
    const line1 = line1s[i] ?? "";
    const zip = zips[i] ?? "";
    const city = cities[i] ?? "";
    if (!name && !line1 && !city) continue;
    rows.push({
      id: ids[i] || undefined,
      name,
      line1,
      line2: line2s[i] ?? "",
      zip,
      city,
      country: countries[i] || "DE",
      infoUrl: infoUrls[i] ?? "",
      isActive:
        activeFlags[i] !== "off" &&
        (activeFlags[i] === "on" || activeFlags[i] === "true" || activeFlags[i] === "1"),
    });
  }
  return rows;
}
