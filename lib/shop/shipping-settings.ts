import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

const DEFAULT_ID = "default";

export type ShopShippingSettingsDTO = {
  shippingCountryCodes: string[];
  shippingRatesCentsByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
};

export function parseShippingRatesFromJson(raw: Prisma.JsonValue): Record<string, number> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const code = k.trim().toUpperCase();
    if (code.length !== 2) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 10_000_000) continue;
    out[code] = n;
  }
  return out;
}

function isPrismaUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

export async function getShopShippingSettings(): Promise<ShopShippingSettingsDTO> {
  const prisma = getPrisma();
  let row = await prisma.shopShippingSettings.findUnique({ where: { id: DEFAULT_ID } });
  if (!row) {
    try {
      row = await prisma.shopShippingSettings.create({
        data: {
          id: DEFAULT_ID,
          shippingCountryCodes: ["DE"],
          shippingRatesCentsByCountry: {},
          freeShippingFromSubtotalGrossCents: null,
        },
      });
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        row = await prisma.shopShippingSettings.findUnique({ where: { id: DEFAULT_ID } });
      } else {
        throw e;
      }
    }
  }
  if (!row) {
    return {
      shippingCountryCodes: ["DE"],
      shippingRatesCentsByCountry: {},
      freeShippingFromSubtotalGrossCents: null,
    };
  }
  const codes = (row.shippingCountryCodes ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length === 2);
  const uniqueSorted = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return {
    shippingCountryCodes: uniqueSorted.length ? uniqueSorted : ["DE"],
    shippingRatesCentsByCountry: parseShippingRatesFromJson(row.shippingRatesCentsByCountry),
    freeShippingFromSubtotalGrossCents: row.freeShippingFromSubtotalGrossCents,
  };
}
