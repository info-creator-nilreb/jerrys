import { getPrisma } from "@/lib/db/prisma";
import { derivePromotionDisplayStatus } from "@/lib/promotions/status";
import type { PromotionDisplayStatus } from "@/lib/promotions/types";

export type AdminPromotionRow = {
  id: string;
  title: string;
  promotionType: string;
  applicationMode: string;
  code: string | null;
  usageCount: number;
  startDate: Date;
  endDate: Date;
  isEnabled: boolean;
  publishedOnce: boolean;
  displayStatus: PromotionDisplayStatus;
};

export async function listPromotionsForAdmin(): Promise<AdminPromotionRow[]> {
  const rows = await getPrisma().promotion.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    promotionType: r.promotionType,
    applicationMode: r.applicationMode,
    code: r.code,
    usageCount: r.usageCount,
    startDate: r.startDate,
    endDate: r.endDate,
    isEnabled: r.isEnabled,
    publishedOnce: r.publishedOnce,
    displayStatus: derivePromotionDisplayStatus(
      {
        isEnabled: r.isEnabled,
        publishedOnce: r.publishedOnce,
        startDate: r.startDate,
        endDate: r.endDate,
      },
      now,
    ),
  }));
}

export async function getPromotionByIdForAdmin(id: string) {
  return getPrisma().promotion.findUnique({ where: { id } });
}
