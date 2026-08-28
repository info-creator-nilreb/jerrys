/**
 * Konservatives Matching Shop-Variante ↔ Zettle-Variante.
 * Automatisch nur bei eindeutiger 1:1-Zuordnung; sonst manuell.
 *
 * Reihenfolge: SKU → Barcode (Shop-SKU vs. Zettle-Barcode) → Name
 * (Produkt+Variante, danach zusammengesetzter Titel).
 */

export type ZettleMatchMethod = "sku" | "barcode" | "name";

export type ShopVariantMatchInput = {
  productVariantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string;
  mappedZettleVariantUuid: string | null;
};

export type ZettleVariantMatchInput = {
  productUuid: string;
  variantUuid: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  barcode: string | null;
};

export type UniqueZettleMatch = {
  productVariantId: string;
  zettleProductUuid: string;
  zettleVariantUuid: string;
  zettleProductName: string;
  zettleVariantName: string | null;
  method: ZettleMatchMethod;
};

export type AmbiguousZettleCandidate = {
  productUuid: string;
  variantUuid: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  barcode: string | null;
};

export type AmbiguousZettleMatch = {
  productVariantId: string;
  method: ZettleMatchMethod;
  candidates: AmbiguousZettleCandidate[];
};

export type ZettleVariantMatchResult = {
  unique: UniqueZettleMatch[];
  ambiguous: AmbiguousZettleMatch[];
  unmatched: Array<{ productVariantId: string }>;
  skippedMapped: number;
};

const MEANINGLESS_VARIANT_NAMES = new Set(["", "default title"]);

export function normalizeZettleMatchKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeZettleIdentifier(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeZettleVariantName(value: string | null | undefined): string {
  const n = normalizeZettleMatchKey(value ?? "");
  if (MEANINGLESS_VARIANT_NAMES.has(n)) return "";
  return n;
}

export function zettleNameMatchKey(productName: string, variantName: string | null | undefined): string {
  return `${normalizeZettleMatchKey(productName)}\0${normalizeZettleVariantName(variantName)}`;
}

export function zettleCompositeNameKey(
  productName: string,
  variantName: string | null | undefined,
): string {
  const product = normalizeZettleMatchKey(productName);
  const variant = normalizeZettleVariantName(variantName);
  if (!product) return variant;
  return variant ? `${product} ${variant}` : product;
}

export function zettleCatalogToMatchInputs(
  products: Array<{
    uuid: string;
    name: string;
    variants: Array<{
      uuid: string;
      name: string | null;
      sku: string | null;
      barcode?: string | null;
    }>;
  }>,
): ZettleVariantMatchInput[] {
  const rows: ZettleVariantMatchInput[] = [];
  for (const product of products) {
    for (const variant of product.variants) {
      rows.push({
        productUuid: product.uuid,
        variantUuid: variant.uuid,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        barcode: variant.barcode ?? null,
      });
    }
  }
  return rows;
}

export function matchZettleVariants(input: {
  shopVariants: ShopVariantMatchInput[];
  zettleVariants: ZettleVariantMatchInput[];
}): ZettleVariantMatchResult {
  const usedShop = new Set<string>();
  const usedZettle = new Set<string>();
  let skippedMapped = 0;

  for (const shop of input.shopVariants) {
    if (shop.mappedZettleVariantUuid) {
      usedShop.add(shop.productVariantId);
      usedZettle.add(shop.mappedZettleVariantUuid);
      skippedMapped += 1;
    }
  }

  const unique: UniqueZettleMatch[] = [];

  const remainingShop = () =>
    input.shopVariants.filter((s) => !usedShop.has(s.productVariantId));
  const remainingZettle = () =>
    input.zettleVariants.filter((z) => !usedZettle.has(z.variantUuid));

  const applyPass = (
    method: ZettleMatchMethod,
    shopKeys: (shop: ShopVariantMatchInput) => string[],
    zettleKeys: (zettle: ZettleVariantMatchInput) => string[],
  ) => {
    const shops = remainingShop();
    const zettles = remainingZettle();
    const shopIndex = indexByKeys(shops, shopKeys, (s) => s.productVariantId);
    const zettleIndex = indexByKeys(zettles, zettleKeys, (z) => z.variantUuid);

    for (const [key, shopHits] of shopIndex) {
      const zettleHits = zettleIndex.get(key) ?? [];
      if (shopHits.length !== 1 || zettleHits.length !== 1) continue;
      const shop = shopHits[0];
      const zettle = zettleHits[0];
      if (!shop || !zettle) continue;
      if (usedShop.has(shop.productVariantId) || usedZettle.has(zettle.variantUuid)) continue;
      usedShop.add(shop.productVariantId);
      usedZettle.add(zettle.variantUuid);
      unique.push(toUniqueMatch(shop, zettle, method));
    }
  };

  applyPass(
    "sku",
    (shop) => nonempty([normalizeZettleIdentifier(shop.sku)]),
    (zettle) => nonempty([normalizeZettleIdentifier(zettle.sku)]),
  );
  applyPass(
    "barcode",
    (shop) => nonempty([normalizeZettleIdentifier(shop.sku)]),
    (zettle) => nonempty([normalizeZettleIdentifier(zettle.barcode)]),
  );
  applyPass(
    "name",
    (shop) => nonempty([zettleNameMatchKey(shop.productTitle, shop.variantTitle)]),
    (zettle) => nonempty([zettleNameMatchKey(zettle.productName, zettle.variantName)]),
  );
  applyPass(
    "name",
    (shop) => nonempty([zettleCompositeNameKey(shop.productTitle, shop.variantTitle)]),
    (zettle) =>
      nonempty([
        zettleCompositeNameKey(zettle.productName, zettle.variantName),
        normalizeZettleMatchKey(zettle.productName),
      ]),
  );

  const ambiguous: AmbiguousZettleMatch[] = [];
  const unmatched: Array<{ productVariantId: string }> = [];
  const leftoverZettle = remainingZettle();

  for (const shop of remainingShop()) {
    const grouped = leftoverCandidatesByMethod(shop, leftoverZettle);
    const all = uniqueCandidates(grouped.flatMap((g) => g.candidates));
    if (all.length === 0) {
      unmatched.push({ productVariantId: shop.productVariantId });
      continue;
    }
    if (all.length === 1) {
      unmatched.push({ productVariantId: shop.productVariantId });
      continue;
    }
    const preferred = grouped.find((g) => g.candidates.length > 1) ?? grouped[0];
    ambiguous.push({
      productVariantId: shop.productVariantId,
      method: preferred?.method ?? "name",
      candidates: all,
    });
  }

  return { unique, ambiguous, unmatched, skippedMapped };
}

function leftoverCandidatesByMethod(
  shop: ShopVariantMatchInput,
  zettles: ZettleVariantMatchInput[],
): Array<{ method: ZettleMatchMethod; candidates: AmbiguousZettleCandidate[] }> {
  const sku = normalizeZettleIdentifier(shop.sku);
  const nameKey = zettleNameMatchKey(shop.productTitle, shop.variantTitle);
  const composite = zettleCompositeNameKey(shop.productTitle, shop.variantTitle);
  const groups: Array<{ method: ZettleMatchMethod; candidates: AmbiguousZettleCandidate[] }> = [];

  if (sku) {
    const skuHits = zettles.filter((z) => normalizeZettleIdentifier(z.sku) === sku);
    if (skuHits.length > 0) groups.push({ method: "sku", candidates: skuHits.map(toCandidate) });
    const barcodeHits = zettles.filter((z) => normalizeZettleIdentifier(z.barcode) === sku);
    if (barcodeHits.length > 0) {
      groups.push({ method: "barcode", candidates: barcodeHits.map(toCandidate) });
    }
  }

  const nameHits = zettles.filter((z) => zettleNameMatchKey(z.productName, z.variantName) === nameKey);
  if (nameHits.length > 0) groups.push({ method: "name", candidates: nameHits.map(toCandidate) });

  const compositeHits = zettles.filter((z) => {
    const keys = new Set(
      nonempty([
        zettleCompositeNameKey(z.productName, z.variantName),
        normalizeZettleMatchKey(z.productName),
      ]),
    );
    return keys.has(composite);
  });
  if (compositeHits.length > 0) {
    groups.push({ method: "name", candidates: compositeHits.map(toCandidate) });
  }

  return groups;
}

function toUniqueMatch(
  shop: ShopVariantMatchInput,
  zettle: ZettleVariantMatchInput,
  method: ZettleMatchMethod,
): UniqueZettleMatch {
  return {
    productVariantId: shop.productVariantId,
    zettleProductUuid: zettle.productUuid,
    zettleVariantUuid: zettle.variantUuid,
    zettleProductName: zettle.productName,
    zettleVariantName: zettle.variantName,
    method,
  };
}

function toCandidate(zettle: ZettleVariantMatchInput): AmbiguousZettleCandidate {
  return {
    productUuid: zettle.productUuid,
    variantUuid: zettle.variantUuid,
    productName: zettle.productName,
    variantName: zettle.variantName,
    sku: zettle.sku,
    barcode: zettle.barcode,
  };
}

function uniqueCandidates(candidates: AmbiguousZettleCandidate[]): AmbiguousZettleCandidate[] {
  const seen = new Set<string>();
  const out: AmbiguousZettleCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.variantUuid)) continue;
    seen.add(c.variantUuid);
    out.push(c);
  }
  return out;
}

function nonempty(keys: string[]): string[] {
  return keys.filter(Boolean);
}

export function formatZettleAutoMapMessage(input: {
  productCount: number;
  mapped: number;
  mappedBySku: number;
  mappedByBarcode: number;
  mappedByName: number;
  ambiguous: number;
  unmatched: number;
  skippedMapped: number;
  saveErrorCount: number;
}): string {
  const parts = [`${input.productCount} Zettle-Produkte geladen.`];
  if (input.mapped > 0) {
    const by: string[] = [];
    if (input.mappedBySku) by.push(`${input.mappedBySku} SKU`);
    if (input.mappedByBarcode) by.push(`${input.mappedByBarcode} Barcode`);
    if (input.mappedByName) by.push(`${input.mappedByName} Name`);
    parts.push(`Eindeutig zugeordnet: ${input.mapped}${by.length ? ` (${by.join(", ")})` : ""}.`);
  } else {
    parts.push("Keine neue eindeutige Zuordnung.");
  }

  const manual = input.ambiguous + input.unmatched;
  if (manual > 0) {
    const details: string[] = [];
    if (input.ambiguous) details.push(`${input.ambiguous} mehrdeutig`);
    if (input.unmatched) details.push(`${input.unmatched} ohne Treffer`);
    parts.push(`Manuell prüfen: ${details.join(", ")}.`);
  } else if (input.mapped > 0 || input.skippedMapped > 0) {
    parts.push("Alle Shop-Varianten sind zugeordnet.");
  }

  if (input.saveErrorCount > 0) {
    parts.push(`${input.saveErrorCount} Zuordnung(en) konnten nicht gespeichert werden.`);
  }

  return parts.join(" ");
}

function indexByKeys<T>(
  items: T[],
  keysOf: (item: T) => string[],
  idOf: (item: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const seen = new Set<string>();
    for (const key of keysOf(item)) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const list = map.get(key);
      if (list) {
        if (!list.some((existing) => idOf(existing) === idOf(item))) list.push(item);
      } else {
        map.set(key, [item]);
      }
    }
  }
  return map;
}
