import { z } from "zod";
import { addressLine1HouseNumberMessage } from "@/lib/checkout/address-line-validation";
import { postalCodeErrorMessage } from "@/lib/checkout/postal-code-validation";
import {
  CUSTOMER_ADDRESS_KINDS,
  isCustomerAddressKind,
} from "@/features/customers/domain/customer-address";

const emptyToUndef = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s && s.length > 0 ? s : undefined));

export const customerAddressKindSchema = z
  .string()
  .trim()
  .refine(isCustomerAddressKind, "Ungültige Adressart.");

export const customerAddressFieldsSchema = z
  .object({
    label: z.string().trim().max(80).optional().transform((v) => (v && v.length > 0 ? v : undefined)),
    firstName: z.string().trim().min(1, "Vorname ist erforderlich.").max(80),
    lastName: z.string().trim().min(1, "Nachname ist erforderlich.").max(80),
    company: emptyToUndef,
    line1: z.string().trim().min(1, "Straße und Hausnummer sind erforderlich.").max(120),
    line2: emptyToUndef,
    zip: z.string().trim().min(1, "PLZ ist erforderlich.").max(20),
    city: z.string().trim().min(1, "Ort ist erforderlich.").max(80),
    country: z
      .string()
      .trim()
      .min(2)
      .max(2)
      .transform((c) => c.toUpperCase())
      .default("DE"),
    isDefault: z
      .preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean())
      .optional()
      .default(false),
  })
  .superRefine((val, ctx) => {
    const zipErr = postalCodeErrorMessage(val.country, val.zip);
    if (zipErr) ctx.addIssue({ code: "custom", path: ["zip"], message: zipErr });
    const lineErr = addressLine1HouseNumberMessage(val.country, val.line1);
    if (lineErr) ctx.addIssue({ code: "custom", path: ["line1"], message: lineErr });
  });

export const customerAddressCreateSchema = customerAddressFieldsSchema.extend({
  kind: customerAddressKindSchema,
});

export const customerAddressUpdateSchema = customerAddressFieldsSchema;

export const customerAddressIdSchema = z.object({
  addressId: z.string().min(1),
});

export { CUSTOMER_ADDRESS_KINDS };
