import { createHash } from "node:crypto";
import {
  normalizeProductAttributes,
  type ProductAttribute,
} from "@/features/catalog/domain/product-attributes";

/** Eingabe für das öffentliche Suchdokument (keine Kundendaten). */
export type ProductSearchDocumentSource = {
  productId: string;
  isActive: boolean;
  title: string;
  subtitle?: string | null;
  leadText?: string | null;
  descriptionHtml?: string | null;
  categoryTag?: string | null;
  categoryTitles?: string[];
  collectionTitles?: string[];
  featureBullets?: string[];
  attributes?: unknown;
  materialText?: string | null;
  dimensionsText?: string | null;
  weightText?: string | null;
  /** Summe availableQuantity aktiver Varianten. */
  availableQuantityTotal?: number;
  /** true wenn mind. eine aktive Variante availableQuantity > 0 hat. */
  inStock?: boolean;
};

export type BuiltProductSearchDocument = {
  productId: string;
  /** false → Dokument darf nicht indexiert werden (inaktiv). */
  indexable: boolean;
  documentText: string;
  contentHash: string;
  availabilityLabel: "available" | "unavailable" | "unknown";
};

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw?.trim();
    if (!v) continue;
    const key = v.toLocaleLowerCase("de");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function formatAttributes(attrs: ProductAttribute[]): string {
  return attrs
    .map((a) => {
      const values = a.values.map((v) => v.trim()).filter(Boolean);
      if (values.length === 0) return null;
      return `${a.label}: ${values.join(", ")}`;
    })
    .filter((line): line is string => line != null)
    .join("\n");
}

export function resolveSearchAvailability(input: {
  availableQuantityTotal?: number;
  inStock?: boolean;
}): "available" | "unavailable" | "unknown" {
  if (typeof input.inStock === "boolean") {
    return input.inStock ? "available" : "unavailable";
  }
  if (typeof input.availableQuantityTotal === "number") {
    return input.availableQuantityTotal > 0 ? "available" : "unavailable";
  }
  return "unknown";
}

/**
 * Baut den öffentlichen Klartext für semantische/lexikalische Indexierung.
 * Enthält bewusst keine Preise, Kunden-, Bestell- oder internen Admin-Daten.
 */
export function buildProductSearchDocument(
  source: ProductSearchDocumentSource,
): BuiltProductSearchDocument {
  const availabilityLabel = resolveSearchAvailability(source);
  const attributes = normalizeProductAttributes(source.attributes);
  const description = source.descriptionHtml
    ? stripHtmlToPlain(source.descriptionHtml)
    : "";

  const lines = [
    source.title.trim(),
    source.subtitle?.trim() || "",
    source.leadText?.trim() || "",
    description,
    source.categoryTag?.trim() || "",
    uniqueNonEmpty(source.categoryTitles ?? []).join(", "),
    uniqueNonEmpty(source.collectionTitles ?? []).join(", "),
    (source.featureBullets ?? []).map((b) => b.trim()).filter(Boolean).join("\n"),
    formatAttributes(attributes),
    source.materialText?.trim() || "",
    source.dimensionsText?.trim() || "",
    source.weightText?.trim() || "",
    `Verfügbarkeit: ${availabilityLabel}`,
  ]
    .map((l) => l.trim())
    .filter(Boolean);

  const documentText = lines.join("\n\n").slice(0, 12_000);
  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        v: 1,
        productId: source.productId,
        isActive: source.isActive,
        documentText,
        availabilityLabel,
      }),
      "utf8",
    )
    .digest("hex");

  return {
    productId: source.productId,
    indexable: source.isActive === true,
    documentText,
    contentHash,
    availabilityLabel,
  };
}
