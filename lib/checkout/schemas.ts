import { z } from "zod";
import { nonEmptyString } from "@/lib/validation/form";

export const paymentMethodSchema = z.enum(["vorkasse", "paypal", "klarna"]);

const emptyToUndef = z.string().trim().optional().transform((s) => (s === "" ? undefined : s));

const checkoutBase = z.object({
  email: z.string().trim().email({ message: "Gültige E-Mail erforderlich." }),
  shippingFirstName: nonEmptyString,
  shippingLastName: nonEmptyString,
  shippingCompany: emptyToUndef,
  shippingLine1: nonEmptyString,
  shippingLine2: emptyToUndef,
  shippingZip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Postleitzahl (5 Ziffern)."),
  shippingCity: nonEmptyString,
  shippingCountry: z.string().trim().min(2).max(2).default("DE"),
  billingUseShipping: z.preprocess((v) => (v === "no" ? "no" : "yes"), z.enum(["yes", "no"])),
  billingFirstName: z.string().optional(),
  billingLastName: z.string().optional(),
  billingCompany: emptyToUndef,
  billingLine1: z.string().optional(),
  billingLine2: emptyToUndef,
  billingZip: z.string().optional(),
  billingCity: z.string().optional(),
  billingCountry: z.string().optional(),
  phone: emptyToUndef,
  paymentMethod: paymentMethodSchema,
  idempotencyKey: z.string().uuid(),
});

export const checkoutFormSchema = checkoutBase
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
    need("billingZip", "Postleitzahl (5 Ziffern).", /^\d{5}$/.test(zc));
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
            billingCountry: val.billingCountry?.trim() || "DE",
          };

    return {
      email: val.email,
      shippingFirstName: val.shippingFirstName,
      shippingLastName: val.shippingLastName,
      shippingCompany: val.shippingCompany,
      shippingLine1: val.shippingLine1,
      shippingLine2: val.shippingLine2,
      shippingZip: val.shippingZip,
      shippingCity: val.shippingCity,
      shippingCountry: val.shippingCountry,
      ...billing,
      phone: val.phone,
      paymentMethod: val.paymentMethod,
      idempotencyKey: val.idempotencyKey,
    };
  });

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
