import { z } from "zod";
import { nonEmptyString } from "@/lib/validation/form";
import { addressLine1HouseNumberMessage } from "@/lib/checkout/address-line-validation";
import { normalizeAddressText } from "@/lib/checkout/address-text";
import { parseCheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import { postalCodeErrorMessage } from "@/lib/checkout/postal-code-validation";

export const paymentMethodSchema = z.enum(["paypal"]);

/** `null` (z. B. aus APIs) wie `undefined` behandeln. */
const nullToUndef = (v: unknown) => (v === null ? undefined : v);

const emptyToUndef = z.preprocess(
  nullToUndef,
  z
    .string()
    .transform(normalizeAddressText)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
);

/** Straße/Ort: Mehrfach-Leerzeichen aus Vorschlag + getippter Hausnummer zusammenfassen. */
const requiredAddressText = z.string().transform(normalizeAddressText).pipe(nonEmptyString);

const optionalAddressText = z.preprocess(
  nullToUndef,
  z.string().transform(normalizeAddressText).optional(),
);

const checkoutBase = z.object({
  email: z.string().trim().email({ message: "Gültige E-Mail erforderlich." }),
  shippingFirstName: requiredAddressText,
  shippingLastName: requiredAddressText,
  shippingCompany: emptyToUndef,
  shippingLine1: requiredAddressText,
  shippingLine2: emptyToUndef,
  shippingZip: z.string().transform(normalizeAddressText),
  shippingCity: requiredAddressText,
  shippingCountry: z.string().trim().min(2).max(2).default("DE"),
  billingUseShipping: z.preprocess((v) => (v === "no" ? "no" : "yes"), z.enum(["yes", "no"])),
  billingFirstName: optionalAddressText,
  billingLastName: optionalAddressText,
  billingCompany: emptyToUndef,
  billingLine1: optionalAddressText,
  billingLine2: emptyToUndef,
  billingZip: optionalAddressText,
  billingCity: optionalAddressText,
  billingCountry: z.preprocess(nullToUndef, z.string().optional()),
  phone: emptyToUndef,
  paymentMethod: paymentMethodSchema,
  deliveryMethod: z.preprocess(parseCheckoutDeliveryMethod, z.enum(["shipping", "pickup"])),
  /** Eine Checkbox: AGB + Widerrufsbelehrung (siehe Checkout-UI). */
  rechtlicheKenntnis: z.preprocess(
    (v) => (v === "on" ? "on" : ""),
    z.literal("on", {
      error: "Bitte bestätigen Sie die Kenntnisnahme von AGB und Widerrufsbelehrung.",
    }),
  ),
  idempotencyKey: z.string().uuid(),
  checkoutPromotionCode: z.preprocess(nullToUndef, z.string().optional()),
  checkoutDeclineAutomatic: z.preprocess(
    (v) => v === "1" || v === "on",
    z.boolean().optional().default(false),
  ),
  /** Adresse nach der Bestellung im Adressbuch ablegen (nur verifizierte Kunden). */
  saveShippingAddress: z.preprocess(
    (v) => v === "1" || v === "on" || v === true,
    z.boolean().optional().default(false),
  ),
  saveBillingAddress: z.preprocess(
    (v) => v === "1" || v === "on" || v === true,
    z.boolean().optional().default(false),
  ),
});

export const checkoutFormSchema = checkoutBase
  .superRefine((val, ctx) => {
    const shipZipErr = postalCodeErrorMessage(val.shippingCountry, val.shippingZip);
    if (shipZipErr) {
      ctx.addIssue({ code: "custom", path: ["shippingZip"], message: shipZipErr });
    }
  })
  .superRefine((val, ctx) => {
    const shipLineErr = addressLine1HouseNumberMessage(val.shippingCountry, val.shippingLine1);
    if (shipLineErr) {
      ctx.addIssue({ code: "custom", path: ["shippingLine1"], message: shipLineErr });
    }
  })
  .superRefine((val, ctx) => {
    if (val.billingUseShipping !== "no") return;
    const need = (path: keyof typeof val, msg: string, ok: boolean) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message: msg });
    };
    need("billingFirstName", "Pflichtfeld.", !!val.billingFirstName?.trim());
    need("billingLastName", "Pflichtfeld.", !!val.billingLastName?.trim());
    need("billingLine1", "Pflichtfeld.", !!val.billingLine1?.trim());
    need("billingCity", "Pflichtfeld.", !!val.billingCity?.trim());
    const zc = val.billingZip?.trim() ?? "";
    const bc = (val.billingCountry?.trim() || val.shippingCountry).toUpperCase();
    const billZipErr = postalCodeErrorMessage(bc, zc);
    if (billZipErr) {
      ctx.addIssue({ code: "custom", path: ["billingZip"], message: billZipErr });
    }
    const billLineErr = addressLine1HouseNumberMessage(bc, val.billingLine1 ?? "");
    if (billLineErr) {
      ctx.addIssue({ code: "custom", path: ["billingLine1"], message: billLineErr });
    }
  })
  .transform((val) => {
    const billing =
      val.billingUseShipping === "yes"
        ? {
            billingFirstName: val.shippingFirstName,
            billingLastName: val.shippingLastName,
            billingCompany: val.shippingCompany,
            billingLine1: val.shippingLine1,
            billingLine2: val.shippingLine2,
            billingZip: val.shippingZip,
            billingCity: val.shippingCity,
            billingCountry: val.shippingCountry,
          }
        : {
            billingFirstName: val.billingFirstName!.trim(),
            billingLastName: val.billingLastName!.trim(),
            billingCompany: val.billingCompany,
            billingLine1: val.billingLine1!.trim(),
            billingLine2: val.billingLine2,
            billingZip: val.billingZip!.trim(),
            billingCity: val.billingCity!.trim(),
            billingCountry: val.billingCountry?.trim() || val.shippingCountry,
          };

    return {
      email: val.email,
      checkoutPromotionCode: val.checkoutPromotionCode?.trim() ?? "",
      checkoutDeclineAutomatic: val.checkoutDeclineAutomatic ?? false,
      shippingFirstName: val.shippingFirstName,
      shippingLastName: val.shippingLastName,
      shippingCompany: val.shippingCompany,
      shippingLine1: val.shippingLine1,
      shippingLine2: val.shippingLine2,
      shippingZip: val.shippingZip.trim(),
      shippingCity: val.shippingCity,
      shippingCountry: val.shippingCountry.trim().toUpperCase(),
      ...billing,
      billingCountry: billing.billingCountry.trim().toUpperCase(),
      phone: val.phone,
      paymentMethod: val.paymentMethod,
      deliveryMethod: val.deliveryMethod,
      idempotencyKey: val.idempotencyKey,
      saveShippingAddress: val.saveShippingAddress ?? false,
      saveBillingAddress: val.saveBillingAddress ?? false,
    };
  });



export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
