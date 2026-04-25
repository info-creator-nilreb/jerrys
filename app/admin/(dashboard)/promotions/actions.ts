"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db/prisma";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import { generateRandomPromotionCode } from "@/lib/promotions/code-generate";
import { z } from "zod";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

function parseDateStartUtc(dateStr: string): Date {
  return new Date(`${dateStr.trim()}T00:00:00.000Z`);
}

function parseDateEndUtc(dateStr: string): Date {
  return new Date(`${dateStr.trim()}T23:59:59.999Z`);
}

const upsertSchema = z
  .object({
    id: z.preprocess(
      (v) => (v == null || v === "" ? undefined : String(v)),
      z.string().min(1).optional(),
    ),
    title: z.string().trim().min(1, "Titel erforderlich."),
    promotionType: z.enum(["order_discount", "free_shipping", "cheapest_item_percent"]),
    applicationMode: z.enum(["automatic", "code"]),
    code: z.string().trim().optional(),
    discountValueType: z.enum(["percent", "fixed"]),
    discountValuePercent: z.string().optional(),
    discountValueEuro: z.string().optional(),
    minimumRequirementType: z.enum(["none", "cart_value"]),
    minimumCartEuro: z.string().optional(),
    startDate: z.string().trim().min(1),
    endDate: z.string().trim().min(1),
    intent: z.enum(["publish", "draft"]),
    freeShippingCountryScope: z.enum(["all", "allow", "deny"]),
    freeShippingCountryCodes: z.array(z.string().length(2)).default([]),
  })
  .superRefine((val, ctx) => {
    const start = parseDateStartUtc(val.startDate);
    const end = parseDateEndUtc(val.endDate);
    if (end < start) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Enddatum darf nicht vor dem Startdatum liegen." });
    }
    if (val.applicationMode === "code") {
      const c = (val.code ?? "").trim().toUpperCase();
      if (!c) ctx.addIssue({ code: "custom", path: ["code"], message: "Rabattcode erforderlich." });
      else if (!/^[A-Z0-9]{1,32}$/.test(c)) {
        ctx.addIssue({
          code: "custom",
          path: ["code"],
          message: "Code nur aus Großbuchstaben und Ziffern.",
        });
      }
    }
    if (val.promotionType === "order_discount") {
      if (val.discountValueType === "percent") {
        const p = Number(val.discountValuePercent?.replace(",", "."));
        if (val.discountValuePercent == null || val.discountValuePercent.trim() === "" || Number.isNaN(p)) {
          ctx.addIssue({ code: "custom", path: ["discountValuePercent"], message: "Prozentwert erforderlich." });
        } else if (p <= 0 || p > 100) {
          ctx.addIssue({ code: "custom", path: ["discountValuePercent"], message: "Prozent zwischen 1 und 100." });
        }
      } else {
        const e = Number(String(val.discountValueEuro ?? "").replace(",", "."));
        if (
          val.discountValueEuro == null ||
          String(val.discountValueEuro).trim() === "" ||
          Number.isNaN(e)
        ) {
          ctx.addIssue({ code: "custom", path: ["discountValueEuro"], message: "Betrag erforderlich." });
        } else if (e <= 0) {
          ctx.addIssue({ code: "custom", path: ["discountValueEuro"], message: "Betrag muss größer 0 sein." });
        }
      }
    }
    if (val.promotionType === "cheapest_item_percent") {
      const p = Number(val.discountValuePercent?.replace(",", "."));
      if (val.discountValuePercent == null || val.discountValuePercent.trim() === "" || Number.isNaN(p)) {
        ctx.addIssue({ code: "custom", path: ["discountValuePercent"], message: "Prozentwert erforderlich." });
      } else if (p <= 0 || p > 100) {
        ctx.addIssue({ code: "custom", path: ["discountValuePercent"], message: "Prozent zwischen 1 und 100." });
      }
    }
    if (val.promotionType === "free_shipping") {
      if (val.freeShippingCountryScope === "allow" && val.freeShippingCountryCodes.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["freeShippingCountryCodes"],
          message: "Mindestens ein Land für „Nur ausgewählte Länder“ wählen.",
        });
      }
    }
    if (val.minimumRequirementType === "cart_value") {
      const m = Number(String(val.minimumCartEuro ?? "").replace(",", "."));
      if (
        val.minimumCartEuro == null ||
        String(val.minimumCartEuro).trim() === "" ||
        Number.isNaN(m)
      ) {
        ctx.addIssue({ code: "custom", path: ["minimumCartEuro"], message: "Mindestbetrag erforderlich." });
      } else if (m <= 0) {
        ctx.addIssue({ code: "custom", path: ["minimumCartEuro"], message: "Mindestbetrag muss größer 0 sein." });
      }
    }
  });

export type PromotionFormState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

export async function savePromotion(_prev: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  await requireSession();

  const raw = {
    id: formData.get("id")?.toString(),
    title: formData.get("title")?.toString() ?? "",
    promotionType: formData.get("promotionType")?.toString() ?? "order_discount",
    applicationMode: formData.get("applicationMode")?.toString() ?? "code",
    code: formData.get("code")?.toString() ?? "",
    discountValueType: formData.get("discountValueType")?.toString() ?? "percent",
    discountValuePercent: formData.get("discountValuePercent")?.toString(),
    discountValueEuro: formData.get("discountValueEuro")?.toString(),
    minimumRequirementType: formData.get("minimumRequirementType")?.toString() ?? "none",
    minimumCartEuro: formData.get("minimumCartEuro")?.toString(),
    startDate: formData.get("startDate")?.toString() ?? "",
    endDate: formData.get("endDate")?.toString() ?? "",
    intent: formData.get("intent")?.toString() === "draft" ? "draft" : "publish",
    freeShippingCountryScope: (() => {
      const s = formData.get("freeShippingCountryScope")?.toString() ?? "all";
      if (s === "allow" || s === "deny") return s;
      return "all" as const;
    })(),
    freeShippingCountryCodes: formData
      .getAll("freeShippingCountryCodes")
      .map((v) => String(v).trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c)),
  };

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const d = parsed.data;
  const isPublish = d.intent === "publish";
  const codeNormalized =
    d.applicationMode === "code" ? (d.code ?? "").trim().toUpperCase() : null;

  const discountValueType =
    d.promotionType === "free_shipping" || d.promotionType === "cheapest_item_percent" ? "percent" : d.discountValueType;
  const discountValue =
    d.promotionType === "free_shipping"
      ? 0
      : d.promotionType === "cheapest_item_percent"
        ? Math.round(Number(String(d.discountValuePercent).replace(",", ".")))
        : d.discountValueType === "percent"
          ? Math.round(Number(String(d.discountValuePercent).replace(",", ".")))
          : Math.round(Number(String(d.discountValueEuro).replace(",", ".")) * 100);

  const minimumCartValueCents =
    d.minimumRequirementType === "cart_value"
      ? Math.round(Number(String(d.minimumCartEuro).replace(",", ".")) * 100)
      : null;

  const freeShipScope = d.promotionType === "free_shipping" ? d.freeShippingCountryScope : "all";
  const freeShipCodes =
    d.promotionType === "free_shipping" ? [...new Set(d.freeShippingCountryCodes)].sort((a, b) => a.localeCompare(b)) : [];

  if (d.promotionType === "free_shipping" && freeShipCodes.length > 0) {
    const shop = await getShopShippingSettings();
    const allowed = new Set(shop.shippingCountryCodes);
    const invalid = freeShipCodes.filter((c) => !allowed.has(c));
    if (invalid.length > 0) {
      return {
        ok: false,
        error: "Ungültige Länderauswahl.",
        fieldErrors: { freeShippingCountryCodes: "Nur Länder aus der Shop-Versandkonfiguration wählbar." },
      };
    }
  }

  const prisma = getPrisma();

  if (d.id) {
    const existing = await prisma.promotion.findUnique({ where: { id: d.id } });
    if (!existing) {
      return { ok: false, error: "Promotion nicht gefunden." };
    }
    try {
      await prisma.promotion.update({
        where: { id: d.id },
        data: {
          title: d.title,
          promotionType: d.promotionType,
          applicationMode: d.applicationMode,
          code: codeNormalized,
          discountValueType,
          discountValue,
          minimumRequirementType: d.minimumRequirementType,
          minimumCartValueCents,
          startDate: parseDateStartUtc(d.startDate),
          endDate: parseDateEndUtc(d.endDate),
          isEnabled: isPublish ? true : false,
          publishedOnce: isPublish ? true : existing.publishedOnce,
          freeShippingCountryScope: freeShipScope,
          freeShippingCountryCodes: freeShipCodes,
        },
      });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
      if (msg) {
        return { ok: false, error: "Dieser Rabattcode ist bereits vergeben.", fieldErrors: { code: "Bereits vergeben." } };
      }
      return { ok: false, error: "Speichern fehlgeschlagen." };
    }
  } else {
    try {
      await prisma.promotion.create({
        data: {
          title: d.title,
          promotionType: d.promotionType,
          applicationMode: d.applicationMode,
          code: codeNormalized,
          discountValueType,
          discountValue,
          minimumRequirementType: d.minimumRequirementType,
          minimumCartValueCents,
          startDate: parseDateStartUtc(d.startDate),
          endDate: parseDateEndUtc(d.endDate),
          isEnabled: isPublish,
          publishedOnce: isPublish,
          freeShippingCountryScope: freeShipScope,
          freeShippingCountryCodes: freeShipCodes,
        },
      });
    } catch (e: unknown) {
      const dup = e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
      if (dup) {
        return { ok: false, error: "Dieser Rabattcode ist bereits vergeben.", fieldErrors: { code: "Bereits vergeben." } };
      }
      return { ok: false, error: "Anlegen fehlgeschlagen." };
    }
  }

  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function generateUniquePromotionCodeAction(): Promise<{ ok: true; code: string } | { ok: false }> {
  await requireSession();
  const prisma = getPrisma();
  for (let i = 0; i < 24; i++) {
    const code = generateRandomPromotionCode();
    const clash = await prisma.promotion.findUnique({ where: { code }, select: { id: true } });
    if (!clash) {
      return { ok: true, code };
    }
  }
  return { ok: false };
}

export async function setPromotionEnabled(id: string, enabled: boolean, formData?: FormData): Promise<void> {
  void formData;
  await requireSession();
  const prisma = getPrisma();
  await prisma.promotion.update({
    where: { id },
    data: {
      isEnabled: enabled,
      ...(enabled ? { publishedOnce: true } : {}),
    },
  });
  revalidatePath("/admin/promotions");
}
