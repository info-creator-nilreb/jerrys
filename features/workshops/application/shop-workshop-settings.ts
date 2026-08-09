import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

const DEFAULT_SELF_CANCEL_HOURS = 48;

export type ShopWorkshopSettingsView = {
  selfCancelHoursBeforeStart: number;
};

/** Shopweite Workshop-Regeln; legt bei Bedarf die Default-Zeile an. */
export async function getShopWorkshopSettings(): Promise<ShopWorkshopSettingsView> {
  const prisma = getPrisma();
  try {
    const row = await prisma.shopWorkshopSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        selfCancelHoursBeforeStart: DEFAULT_SELF_CANCEL_HOURS,
      },
      update: {},
      select: { selfCancelHoursBeforeStart: true },
    });
    return { selfCancelHoursBeforeStart: row.selfCancelHoursBeforeStart };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { selfCancelHoursBeforeStart: DEFAULT_SELF_CANCEL_HOURS };
    }
    throw e;
  }
}
