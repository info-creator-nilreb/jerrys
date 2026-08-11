import type { ComponentType, ReactNode } from "react";
import { CuratedProductListBlock } from "@/components/content/blocks/curated-product-list-block";
import { FaqBlock } from "@/components/content/blocks/faq-block";
import { HeroBlock } from "@/components/content/blocks/hero-block";
import { ImageTextBlock } from "@/components/content/blocks/image-text-block";
import { ProductCategoryPickBlock } from "@/components/content/blocks/product-category-pick-block";
import { RichTextBlock } from "@/components/content/blocks/rich-text-block";
import { SocialReviewsBlock } from "@/components/content/blocks/social-reviews-block";
import { UspStripBlock } from "@/components/content/blocks/usp-strip-block";
import { WorkshopCalendarBlock } from "@/components/content/blocks/workshop-calendar-block";
import {
  CONTENT_BLOCK_SCHEMAS,
  type ContentBlockDataMap,
} from "@/lib/content/block-schemas";
import {
  isContentBlockType,
  type ContentBlockType,
} from "@/lib/content/block-types";
import type { z } from "zod";

type BlockComponentProps<T> = { data: T; blockId: string };

export type ContentBlockRegistryEntry<T> = {
  schema: z.ZodType<T>;
  Component:
    | ComponentType<BlockComponentProps<T>>
    | ((props: BlockComponentProps<T>) => ReactNode | Promise<ReactNode>);
};

export const CONTENT_BLOCK_REGISTRY = {
  hero: { schema: CONTENT_BLOCK_SCHEMAS.hero, Component: HeroBlock },
  richText: { schema: CONTENT_BLOCK_SCHEMAS.richText, Component: RichTextBlock },
  imageText: { schema: CONTENT_BLOCK_SCHEMAS.imageText, Component: ImageTextBlock },
  productCategoryPick: {
    schema: CONTENT_BLOCK_SCHEMAS.productCategoryPick,
    Component: ProductCategoryPickBlock,
  },
  curatedProductList: {
    schema: CONTENT_BLOCK_SCHEMAS.curatedProductList,
    Component: CuratedProductListBlock,
  },
  uspStrip: { schema: CONTENT_BLOCK_SCHEMAS.uspStrip, Component: UspStripBlock },
  faq: { schema: CONTENT_BLOCK_SCHEMAS.faq, Component: FaqBlock },
  socialReviews: {
    schema: CONTENT_BLOCK_SCHEMAS.socialReviews,
    Component: SocialReviewsBlock,
  },
  workshopCalendar: {
    schema: CONTENT_BLOCK_SCHEMAS.workshopCalendar,
    Component: WorkshopCalendarBlock,
  },
} as const satisfies {
  [K in ContentBlockType]: ContentBlockRegistryEntry<ContentBlockDataMap[K]>;
};

export function resolveContentBlockEntry(
  type: string,
): ContentBlockRegistryEntry<unknown> | null {
  if (!isContentBlockType(type)) return null;
  return CONTENT_BLOCK_REGISTRY[type] as ContentBlockRegistryEntry<unknown>;
}
