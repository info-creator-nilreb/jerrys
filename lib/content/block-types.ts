/**
 * Kuratierte Block-Typen v1 (Epic 12 / ADR-0007).
 * Renderer/Zod pro Typ folgen in Slice 2.
 */
export const CONTENT_BLOCK_TYPES = [
  "hero",
  "richText",
  "imageText",
  "productCategoryPick",
  "curatedProductList",
  "uspStrip",
  "faq",
  "socialReviews",
  "workshopCalendar",
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export function isContentBlockType(value: string): value is ContentBlockType {
  return (CONTENT_BLOCK_TYPES as readonly string[]).includes(value);
}
