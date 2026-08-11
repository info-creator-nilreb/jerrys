/**
 * Products API (Post & Parcel Germany) — Produktcodes + Preise für INTERNETMARKE.
 * Auth: Header `dhl-api-key` = Developer-Portal API Key (client_id).
 * Docs: https://developer.dhl.com/api-reference/products-api-post-parcel-germany
 */

export const INTERNETMARKE_PRODUCTS_API_URL =
  "https://api-eu.dhl.com/post/de/information/products/v1/products?profile=IM-PARTNER&shortVersion=true";

export type InternetmarkeCatalogProduct = {
  /** extProductid — für shoppingcart/pdf productCode */
  productCode: number;
  name: string;
  priceCents: number;
  transport: "national" | "international" | "unknown";
  maxWeightG: number | null;
};

export type InternetmarkeFetch = typeof fetch;

function eurosToCents(gross: number): number {
  return Math.round(gross * 100);
}

function parseProduct(raw: Record<string, unknown>): InternetmarkeCatalogProduct | null {
  const codeRaw = raw.extProductid ?? raw.extProductId ?? raw.productid;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string"
        ? Number.parseInt(codeRaw, 10)
        : NaN;
  if (!Number.isFinite(code) || code <= 0) return null;

  const name =
    (typeof raw.extProductname === "string" && raw.extProductname) ||
    (typeof raw.extProductName === "string" && raw.extProductName) ||
    `Produkt ${code}`;

  const gross =
    typeof raw.grossprice === "number"
      ? raw.grossprice
      : typeof raw.grossPrice === "number"
        ? raw.grossPrice
        : null;
  if (gross == null || !Number.isFinite(gross) || gross <= 0) return null;

  const transportRaw = typeof raw.transport === "string" ? raw.transport.toLowerCase() : "";
  const transport =
    transportRaw === "national" || transportRaw === "international"
      ? transportRaw
      : "unknown";

  const maxWeight =
    typeof raw.maxWeight === "number" && Number.isFinite(raw.maxWeight)
      ? raw.maxWeight
      : null;

  return {
    productCode: code,
    name,
    priceCents: eurosToCents(gross),
    transport,
    maxWeightG: maxWeight,
  };
}

/**
 * Lädt die Partner-Produktliste. Kein Portokasse-Token nötig — nur API Key.
 */
export async function fetchInternetmarkeCatalogProducts(
  apiKey: string,
  fetchImpl: InternetmarkeFetch = fetch,
): Promise<
  | { ok: true; products: InternetmarkeCatalogProduct[]; fetchedAt: string }
  | { ok: false; message: string; status?: number }
> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, message: "API Key fehlt." };
  }

  const res = await fetchImpl(INTERNETMARKE_PRODUCTS_API_URL, {
    method: "GET",
    headers: {
      "dhl-api-key": key,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = (await res.text()).slice(0, 240);
    return {
      ok: false,
      status: res.status,
      message: `Products API fehlgeschlagen (${res.status}): ${text || res.statusText}`,
    };
  }

  const data = (await res.json()) as {
    shortSalesProducts?: unknown[];
    date?: string;
  };
  const rows = Array.isArray(data.shortSalesProducts) ? data.shortSalesProducts : [];
  const products: InternetmarkeCatalogProduct[] = [];
  for (const row of rows) {
    if (row && typeof row === "object") {
      const parsed = parseProduct(row as Record<string, unknown>);
      if (parsed) products.push(parsed);
    }
  }

  products.sort((a, b) => {
    if (a.transport !== b.transport) {
      if (a.transport === "national") return -1;
      if (b.transport === "national") return 1;
    }
    return a.name.localeCompare(b.name, "de") || a.productCode - b.productCode;
  });

  return {
    ok: true,
    products,
    fetchedAt: typeof data.date === "string" ? data.date : new Date().toISOString(),
  };
}

export async function findInternetmarkeProductPriceCents(
  apiKey: string,
  productCode: number,
  fetchImpl: InternetmarkeFetch = fetch,
): Promise<number | null> {
  const catalog = await fetchInternetmarkeCatalogProducts(apiKey, fetchImpl);
  if (!catalog.ok) return null;
  return catalog.products.find((p) => p.productCode === productCode)?.priceCents ?? null;
}
