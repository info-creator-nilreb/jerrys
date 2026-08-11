import type { ContentBlockType } from "@/lib/content/block-types";

export const CONTENT_BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  hero: "Hero",
  richText: "Rich-Text",
  imageText: "Bild / Text",
  productCategoryPick: "Produkte (Kategorie/IDs)",
  curatedProductList: "Kuratierte Produktliste",
  uspStrip: "USP-Leiste",
  faq: "FAQ",
  socialReviews: "Social / Reviews",
  workshopCalendar: "Termin-Kalender",
};

export const CONTENT_PAGE_TYPE_LABELS = {
  homepage: "Startseite",
  content: "Inhalt",
  legal: "Rechtstext",
} as const;

export const CONTENT_PAGE_STATUS_LABELS = {
  draft: "Entwurf",
  published: "Veröffentlicht",
} as const;
