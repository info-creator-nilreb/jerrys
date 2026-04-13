"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { parseEuroInputToCents } from "@/lib/catalog/format";
import { isShopShippingCountryCode } from "@/lib/catalog/shipping-countries-catalog";
import { getPrisma } from "@/lib/db/prisma";
import { parseShippingRatesFromJson } from "@/lib/shop/shipping-settings";

const SETTINGS_ID = "default";

export type ShippingSettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

async function requireAdminSession(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

function rateFieldKey(code: string): string {
  return `rateEuro__${code}`;
}

export async function saveShopShippingSettings(
  _prev: ShippingSettingsFormState,
  formData: FormData,
): Promise<ShippingSettingsFormState> {
  await requireAdminSession();

  const rawCodes = formData.getAll("shippingCountryCodes").map((v) => String(v).trim().toUpperCase());
  const uniqueCodes = [...new Set(rawCodes.filter((c) => c.length === 2))];

  const rateEntries: { code: string; euro: string }[] = [];
  for (const code of uniqueCodes) {
    rateEntries.push({
      code,
      euro: String(formData.get(rateFieldKey(code)) ?? "").trim(),
    });
  }

  const freeEuro = String(formData.get("freeShippingFromSubtotalEuro") ?? "").trim();

  const parsed = z
    .object({
      shippingCountryCodes: z.array(z.string()).superRefine((arr, ctx) => {
        if (arr.length === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["shippingCountryCodes"],
            message: "Mindestens ein Versandland auswählen.",
          });
          return;
        }
        for (const c of arr) {
          if (!isShopShippingCountryCode(c)) {
            ctx.addIssue({
              code: "custom",
              path: ["shippingCountryCodes"],
              message: `Ungültiges Land: ${c}`,
            });
            return;
          }
        }
      }),
      rates: z.array(
        z.object({
          code: z.string(),
          euro: z.string(),
        }),
      ),
      freeShippingFromSubtotalEuro: z.string(),
    })
    .safeParse({
      shippingCountryCodes: uniqueCodes,
      rates: rateEntries,
      freeShippingFromSubtotalEuro: freeEuro,
    });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const ratesCents: Record<string, number> = {};
  const fieldErrors: Record<string, string> = {};
  for (const { code, euro } of parsed.data.rates) {
    const cents = parseEuroInputToCents(euro === "" ? "0" : euro);
    if (cents === null) {
      fieldErrors[rateFieldKey(code)] = "Ungültiger Betrag";
      continue;
    }
    if (cents > 10_000_000) {
      fieldErrors[rateFieldKey(code)] = "Max. 100.000,00 €";
      continue;
    }
    ratesCents[code] = cents;
  }
  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  let freeCents: number | null = null;
  if (parsed.data.freeShippingFromSubtotalEuro !== "") {
    const c = parseEuroInputToCents(parsed.data.freeShippingFromSubtotalEuro);
    if (c === null) {
      return { fieldErrors: { freeShippingFromSubtotalEuro: "Ungültiger Betrag" } };
    }
    if (c < 0) {
      return { fieldErrors: { freeShippingFromSubtotalEuro: "Nur positive Beträge." } };
    }
    freeCents = c === 0 ? null : c;
  }

  const prisma = getPrisma();
  await prisma.shopShippingSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      shippingCountryCodes: parsed.data.shippingCountryCodes.sort((a, b) => a.localeCompare(b)),
      shippingRatesCentsByCountry: ratesCents,
      freeShippingFromSubtotalGrossCents: freeCents,
    },
    update: {
      shippingCountryCodes: parsed.data.shippingCountryCodes.sort((a, b) => a.localeCompare(b)),
      shippingRatesCentsByCountry: ratesCents,
      freeShippingFromSubtotalGrossCents: freeCents,
    },
  });

  revalidatePath("/checkout");
  revalidatePath("/warenkorb");
  revalidatePath("/");
  revalidatePath("/admin/versand");
  return { ok: true };
}

export type ShopShippingSettingsForAdminForm = {
  shippingCountryCodes: string[];
  shippingRatesCentsByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
};

export async function getShopShippingSettingsForAdminForm(): Promise<ShopShippingSettingsForAdminForm> {
  await requireAdminSession();
  const row = await getPrisma().shopShippingSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) {
    return {
      shippingCountryCodes: ["DE"],
      shippingRatesCentsByCountry: {},
      freeShippingFromSubtotalGrossCents: null,
    };
  }
  const codes = (row.shippingCountryCodes ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length === 2 && isShopShippingCountryCode(c));
  const sorted = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return {
    shippingCountryCodes: sorted.length ? sorted : ["DE"],
    shippingRatesCentsByCountry: parseShippingRatesFromJson(row.shippingRatesCentsByCountry),
    freeShippingFromSubtotalGrossCents: row.freeShippingFromSubtotalGrossCents,
  };
}
