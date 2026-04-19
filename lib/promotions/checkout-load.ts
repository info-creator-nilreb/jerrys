import type { PrismaClient } from "@/app/generated/prisma/client";
import { normalizePromotionCode } from "@/lib/promotions/engine";

export async function loadPromotionsForCheckoutResolve(
  prisma: PrismaClient,
  promotionCodeRaw: string | null | undefined,
) {
  const codeNorm = normalizePromotionCode(promotionCodeRaw ?? "");
  const [automaticCandidates, codePromotion] = await Promise.all([
    prisma.promotion.findMany({
      where: {
        promotionType: { in: ["order_discount", "free_shipping"] },
        applicationMode: "automatic",
        isEnabled: true,
        publishedOnce: true,
      },
    }),
    codeNorm.length > 0
      ? prisma.promotion.findUnique({ where: { code: codeNorm } })
      : Promise.resolve(null),
  ]);

  return { automaticCandidates, codePromotion, codeNorm };
}
