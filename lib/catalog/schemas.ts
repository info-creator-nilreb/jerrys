import { z } from "zod";
import { parseEuroInputToCents } from "@/lib/catalog/format";
import { centsPairMatchesTax } from "@/lib/catalog/pricing";
import { nonEmptyString } from "@/lib/validation/form";

export const productSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche.");

const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable();

const optionalManufacturerId = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable();

function euroToCentsOptional(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  return parseEuroInputToCents(t);
}

const taxRateSchema = z.coerce.number().int().refine((n) => n === 7 || n === 19, {
  message: "Steuersatz 7 oder 19.",
});

function optionalPositiveIntNullable(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === "" || s === "undefined" || s === "null") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

function optionalPositiveIntMin1Nullable(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === "" || s === "undefined" || s === "null") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

const sharedProductFields = {
  title: nonEmptyString,
  slug: productSlugSchema,
  subtitle: optionalText,
  descriptionHtml: optionalText,
  manufacturerId: optionalManufacturerId,
  productNumber: optionalText,
  taxRatePercent: taxRateSchema,
  priceGrossEuro: z.string().trim().min(1, "Bruttopreis erforderlich"),
  priceNetEuro: z.string().trim().min(1, "Nettopreis erforderlich"),
  listPriceGrossEuro: z.string().trim(),
  listPriceNetEuro: z.string().trim(),
  lowest30GrossEuro: z.string().trim(),
  lowest30NetEuro: z.string().trim(),
  stockQuantity: z.coerce.number().int().min(0),
  deliveryTimeKey: optionalText,
  restockDays: z.preprocess(optionalPositiveIntNullable, z.number().int().min(0).nullable()),
  freeShipping: z.boolean(),
  minOrderQty: z.coerce.number().int().min(1),
  purchaseStep: z.coerce.number().int().min(1),
  maxOrderQty: z.preprocess(optionalPositiveIntMin1Nullable, z.number().int().min(1).nullable()),
  isActive: z.boolean(),
};

function refinePricePairs(
  data: {
    taxRatePercent: number;
    priceGrossEuro: string;
    priceNetEuro: string;
    listPriceGrossEuro: string;
    listPriceNetEuro: string;
    lowest30GrossEuro: string;
    lowest30NetEuro: string;
  },
  ctx: z.RefinementCtx,
) {
  const mainGross = parseEuroInputToCents(data.priceGrossEuro);
  const mainNet = parseEuroInputToCents(data.priceNetEuro);
  if (mainGross === null) {
    ctx.addIssue({ code: "custom", path: ["priceGrossEuro"], message: "Ungültiger Bruttopreis" });
  }
  if (mainNet === null) {
    ctx.addIssue({ code: "custom", path: ["priceNetEuro"], message: "Ungültiger Nettopreis" });
  }
  if (mainGross !== null && mainNet !== null) {
    if (!centsPairMatchesTax(mainGross, mainNet, data.taxRatePercent)) {
      ctx.addIssue({
        code: "custom",
        path: ["priceNetEuro"],
        message: "Brutto/Netto passen nicht zum Steuersatz.",
      });
    }
  }

  const lg = euroToCentsOptional(data.listPriceGrossEuro);
  const ln = euroToCentsOptional(data.listPriceNetEuro);
  if ((lg === null) !== (ln === null)) {
    ctx.addIssue({
      code: "custom",
      path: ["listPriceGrossEuro"],
      message: "Streichpreis bitte brutto und netto angeben oder leer lassen.",
    });
  } else if (lg !== null && ln !== null && !centsPairMatchesTax(lg, ln, data.taxRatePercent)) {
    ctx.addIssue({
      code: "custom",
      path: ["listPriceNetEuro"],
      message: "Streichpreis Brutto/Netto passen nicht zum Steuersatz.",
    });
  }

  const g30 = euroToCentsOptional(data.lowest30GrossEuro);
  const n30 = euroToCentsOptional(data.lowest30NetEuro);
  if ((g30 === null) !== (n30 === null)) {
    ctx.addIssue({
      code: "custom",
      path: ["lowest30GrossEuro"],
      message: "30-Tage-Preis bitte brutto und netto angeben oder leer lassen.",
    });
  } else if (g30 !== null && n30 !== null && !centsPairMatchesTax(g30, n30, data.taxRatePercent)) {
    ctx.addIssue({
      code: "custom",
      path: ["lowest30NetEuro"],
      message: "30-Tage-Preis Brutto/Netto passen nicht zum Steuersatz.",
    });
  }
}

export const productCoreSchema = z.object(sharedProductFields).superRefine(refinePricePairs);

export const productImageSchema = z.object({
  url: nonEmptyString,
  alt: nonEmptyString,
});

export const createProductFormSchema = z
  .object({
    ...sharedProductFields,
    imageUrl: nonEmptyString,
    imageAlt: nonEmptyString,
  })
  .superRefine(refinePricePairs);
