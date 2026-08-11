import {
  CONTENT_BLOCK_TYPES,
  isContentBlockType,
  type ContentBlockType,
} from "@/lib/content/block-types";
import {
  curatedProductListBlockDataSchema,
  type CuratedProductListBlockData,
} from "@/lib/content/blocks/curated-product-list";
import { faqBlockDataSchema, type FaqBlockData } from "@/lib/content/blocks/faq";
import { heroBlockDataSchema, type HeroBlockData } from "@/lib/content/blocks/hero";
import {
  imageTextBlockDataSchema,
  type ImageTextBlockData,
} from "@/lib/content/blocks/image-text";
import {
  productCategoryPickBlockDataSchema,
  type ProductCategoryPickBlockData,
} from "@/lib/content/blocks/product-category-pick";
import {
  richTextBlockDataSchema,
  type RichTextBlockData,
} from "@/lib/content/blocks/rich-text";
import {
  socialReviewsBlockDataSchema,
  type SocialReviewsBlockData,
} from "@/lib/content/blocks/social-reviews";
import {
  uspStripBlockDataSchema,
  type UspStripBlockData,
} from "@/lib/content/blocks/usp-strip";
import {
  workshopCalendarBlockDataSchema,
  type WorkshopCalendarBlockData,
} from "@/lib/content/blocks/workshop-calendar";
import type { z } from "zod";

export type ContentBlockDataMap = {
  hero: HeroBlockData;
  richText: RichTextBlockData;
  imageText: ImageTextBlockData;
  productCategoryPick: ProductCategoryPickBlockData;
  curatedProductList: CuratedProductListBlockData;
  uspStrip: UspStripBlockData;
  faq: FaqBlockData;
  socialReviews: SocialReviewsBlockData;
  workshopCalendar: WorkshopCalendarBlockData;
};

export const CONTENT_BLOCK_SCHEMAS = {
  hero: heroBlockDataSchema,
  richText: richTextBlockDataSchema,
  imageText: imageTextBlockDataSchema,
  productCategoryPick: productCategoryPickBlockDataSchema,
  curatedProductList: curatedProductListBlockDataSchema,
  uspStrip: uspStripBlockDataSchema,
  faq: faqBlockDataSchema,
  socialReviews: socialReviewsBlockDataSchema,
  workshopCalendar: workshopCalendarBlockDataSchema,
} as const satisfies {
  [K in ContentBlockType]: z.ZodType<ContentBlockDataMap[K]>;
};

export function parseContentBlockData(
  type: ContentBlockType,
  data: unknown,
):
  | { ok: true; data: ContentBlockDataMap[ContentBlockType] }
  | { ok: false; error: z.ZodError } {
  const schema = CONTENT_BLOCK_SCHEMAS[type];
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error };
  return { ok: true, data: parsed.data as ContentBlockDataMap[ContentBlockType] };
}

export function resolveContentBlockSchema(type: string) {
  if (!isContentBlockType(type)) return null;
  return CONTENT_BLOCK_SCHEMAS[type];
}

export function listRegisteredContentBlockTypes(): ContentBlockType[] {
  return [...CONTENT_BLOCK_TYPES];
}
