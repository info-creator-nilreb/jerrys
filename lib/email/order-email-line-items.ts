import type { Prisma } from "@/app/generated/prisma/client";
import type { OrderLineItemForEmail } from "@/lib/email/transactional-email-layout";
import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";

const productImageOrderForEmail: Prisma.ProductImageOrderByWithRelationInput[] = [
  { isCover: "desc" },
  { sortOrder: "asc" },
];

/** Prisma-`include` für Order-Zeilen inkl. Cover-Bild (für transaktionale Mails). */
export const orderItemsIncludeForTransactionalEmail = {
  orderBy: { id: "asc" as const },
  include: {
    product: {
      select: {
        images: {
          orderBy: productImageOrderForEmail,
          take: 1,
          select: { url: true, alt: true },
        },
      },
    },
  },
};

/** Minimale Prisma-Form für OrderItem + ein Cover-Bild (sortiert). */
export type OrderItemRowWithCoverImage = {
  productTitleSnapshot: string;
  quantity: number;
  lineTotalGrossCents: number;
  currency: string;
  product: {
    images: readonly { url: string; alt: string }[];
  };
};

export function orderItemsToEmailLineItems(rows: OrderItemRowWithCoverImage[]): OrderLineItemForEmail[] {
  return rows.map((line) => {
    const im = line.product.images[0];
    return {
      productTitleSnapshot: line.productTitleSnapshot,
      quantity: line.quantity,
      lineTotalGrossCents: line.lineTotalGrossCents,
      currency: line.currency,
      coverImageAbsoluteUrl: im ? absoluteUrlForEmail(im.url) : null,
      coverImageAlt: im?.alt ?? null,
    };
  });
}
