/**
 * Shopify-ähnliche Produktmerkmale: Label + Mehrfachwerte (Tags).
 * Kein Kategorie-Schema und keine Vorschlags-Engine — nur strukturierte Stammdaten.
 */

export type ProductAttribute = {
  /** Stabiler Schlüssel, z. B. `shopify.jewelry-material` oder `custom.farbe`. */
  key: string;
  /** Anzeige-Label (DE), z. B. „Schmuckmaterial“. */
  label: string;
  values: string[];
};

const MAX_ATTRIBUTES = 40;
const MAX_VALUES = 20;
const MAX_LABEL = 120;
const MAX_VALUE = 120;
const MAX_KEY = 120;

/** Spaltenheader: `Farbe (product.metafields.shopify.color-pattern)`. */
const METAFIELD_HEADER_RE =
  /^(.+?)\s*\(\s*product\.metafields\.([a-z0-9_-]+)\.([a-z0-9_-]+)\s*\)\s*$/i;

/** Metafields, die nicht als Merkmale landen (eigene Mapping-Ziele / Technik). */
const SKIP_METAFIELD_KEYS = new Set([
  "custom.lieferzeit",
  "custom.lieferhinweis",
  "custom.preorder_date",
  "theme.label_color",
]);

const SKIP_NAMESPACES = new Set(["mm-google-shopping", "next_cart"]);

export function parseAttributeValues(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.startsWith("[") && t.endsWith("]")) {
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .slice(0, MAX_VALUES)
          .map((v) => v.slice(0, MAX_VALUE));
      }
    } catch {
      /* Komma-Liste */
    }
  }
  return t
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, MAX_VALUES)
    .map((v) => v.slice(0, MAX_VALUE));
}

export function parseMetafieldHeader(header: string): {
  label: string;
  namespace: string;
  key: string;
  fullKey: string;
} | null {
  const m = header.trim().match(METAFIELD_HEADER_RE);
  if (!m) return null;
  const label = m[1]!.trim().slice(0, MAX_LABEL);
  const namespace = m[2]!.toLowerCase();
  const key = m[3]!.toLowerCase();
  return {
    label: label || key,
    namespace,
    key,
    fullKey: `${namespace}.${key}`.slice(0, MAX_KEY),
  };
}

/**
 * Liest Kategorie-/Custom-Metafelder aus einer Shopify-CSV-Zeile
 * (Spalten wie im Admin-Export).
 */
export function extractAttributesFromShopifyRow(
  row: Record<string, string>,
): ProductAttribute[] {
  const byKey = new Map<string, ProductAttribute>();

  for (const [header, raw] of Object.entries(row)) {
    const values = parseAttributeValues(String(raw ?? ""));
    if (values.length === 0) continue;
    const meta = parseMetafieldHeader(header);
    if (!meta) continue;
    if (SKIP_NAMESPACES.has(meta.namespace)) continue;
    if (SKIP_METAFIELD_KEYS.has(meta.fullKey)) continue;
    // Nur shopify.* (Kategorie-Merkmale) und custom.* / theme.label
    if (
      meta.namespace !== "shopify" &&
      meta.namespace !== "custom" &&
      !(meta.namespace === "theme" && meta.key === "label")
    ) {
      continue;
    }

    const existing = byKey.get(meta.fullKey);
    if (existing) {
      const merged = [...existing.values];
      for (const v of values) {
        if (!merged.includes(v) && merged.length < MAX_VALUES) merged.push(v);
      }
      existing.values = merged;
    } else {
      byKey.set(meta.fullKey, {
        key: meta.fullKey,
        label: meta.label,
        values,
      });
    }
  }

  return normalizeProductAttributes([...byKey.values()]);
}

export function mergeProductAttributes(
  ...lists: ProductAttribute[][]
): ProductAttribute[] {
  const byKey = new Map<string, ProductAttribute>();
  for (const list of lists) {
    for (const attr of list) {
      const key = attr.key.trim().slice(0, MAX_KEY);
      if (!key) continue;
      const values = attr.values
        .map((v) => v.trim().slice(0, MAX_VALUE))
        .filter(Boolean)
        .slice(0, MAX_VALUES);
      if (values.length === 0) continue;
      const label = (attr.label.trim() || key).slice(0, MAX_LABEL);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { key, label, values });
        continue;
      }
      const merged = [...existing.values];
      for (const v of values) {
        if (!merged.includes(v) && merged.length < MAX_VALUES) merged.push(v);
      }
      existing.values = merged;
      if (!existing.label && label) existing.label = label;
    }
  }
  return normalizeProductAttributes([...byKey.values()]);
}

export function normalizeProductAttributes(input: unknown): ProductAttribute[] {
  if (!Array.isArray(input)) return [];
  const out: ProductAttribute[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const key = String(rec.key ?? "")
      .trim()
      .slice(0, MAX_KEY);
    if (!key || seen.has(key)) continue;
    const label = String(rec.label ?? key)
      .trim()
      .slice(0, MAX_LABEL);
    const rawValues = Array.isArray(rec.values) ? rec.values : [];
    const values = rawValues
      .map((v) => String(v ?? "").trim().slice(0, MAX_VALUE))
      .filter(Boolean)
      .slice(0, MAX_VALUES);
    if (values.length === 0) continue;
    seen.add(key);
    out.push({ key, label: label || key, values });
    if (out.length >= MAX_ATTRIBUTES) break;
  }
  return out;
}

/** Formular: eine Zeile `Label: wert1, wert2` (optional `key|Label: …`). */
export function parseAttributesFormText(raw: string): ProductAttribute[] {
  const lines = String(raw ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_ATTRIBUTES);
  const attrs: ProductAttribute[] = [];
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const left = line.slice(0, colon).trim();
    const right = line.slice(colon + 1);
    const values = parseAttributeValues(right);
    if (values.length === 0) continue;
    let key = "";
    let label = left;
    const pipe = left.indexOf("|");
    if (pipe > 0) {
      key = left.slice(0, pipe).trim();
      label = left.slice(pipe + 1).trim() || key;
    } else {
      key = slugifyAttributeKey(left);
    }
    if (!key) continue;
    attrs.push({ key, label: label.slice(0, MAX_LABEL), values });
  }
  return normalizeProductAttributes(attrs);
}

export function attributesToFormText(attrs: ProductAttribute[]): string {
  return normalizeProductAttributes(attrs)
    .map((a) => `${a.key}|${a.label}: ${a.values.join(", ")}`)
    .join("\n");
}

/** Stabilen Key aus Label erzeugen (für manuell angelegte Merkmale ohne Shopify-Key). */
export function slugifyAttributeKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_KEY - 7);
  return slug ? `custom.${slug}` : `custom.merkmal`;
}

/**
 * Admin-Formular: parallele Felder `attributeKey[]`, `attributeLabel[]`, `attributeValues[]`.
 * Shopify-/Import-Keys bleiben im Hidden-Field; Label und Werte sind sichtbar.
 */
export function attributesFromFormData(formData: FormData): ProductAttribute[] {
  const keys = formData.getAll("attributeKey").map((v) => String(v ?? ""));
  const labels = formData.getAll("attributeLabel").map((v) => String(v ?? ""));
  const valuesRaw = formData.getAll("attributeValues").map((v) => String(v ?? ""));
  const len = Math.max(keys.length, labels.length, valuesRaw.length);
  const attrs: ProductAttribute[] = [];
  for (let i = 0; i < len && attrs.length < MAX_ATTRIBUTES; i++) {
    const label = (labels[i] ?? "").trim().slice(0, MAX_LABEL);
    const values = parseAttributeValues(valuesRaw[i] ?? "");
    if (!label || values.length === 0) continue;
    let key = (keys[i] ?? "").trim().slice(0, MAX_KEY);
    if (!key) key = slugifyAttributeKey(label);
    attrs.push({ key, label, values });
  }
  return normalizeProductAttributes(attrs);
}

/** Technische System-SKU wenn Shopify keine SKU liefert (nicht aus Titel/Handle). */
export function technicalImportSku(
  productId: string,
  index: number,
  total: number,
  used: Set<string>,
): string {
  const base =
    total <= 1 ? `SKU-${productId}` : `SKU-${productId}-${index + 1}`;
  let candidate = base.slice(0, 80);
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 70)}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}
