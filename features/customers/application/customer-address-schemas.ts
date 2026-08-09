import { z } from "zod";
import { addressLine1HouseNumberMessage } from "@/lib/checkout/address-line-validation";
import { normalizeAddressText } from "@/lib/checkout/address-text";
import { postalCodeErrorMessage } from "@/lib/checkout/postal-code-validation";
import {
  CUSTOMER_ADDRESS_KINDS,
  isCustomerAddressKind,
} from "@/features/customers/domain/customer-address";

const emptyToUndef = z
  .string()
  .transform(normalizeAddressText)
  .optional()
  .transform((s) => (s && s.length > 0 ? s : undefined));

const addressText = (max: number, requiredMessage: string) =>
  z
    .string()
    .transform(normalizeAddressText)
    .pipe(z.string().min(1, requiredMessage).max(max));

export const customerAddressKindSchema = z
  .string()
  .trim()
  .refine(isCustomerAddressKind, "Ungültige Adressart.");

export const customerAddressFieldsSchema = z
  .object({
    label: z
      .string()
      .transform(normalizeAddressText)
      .pipe(z.string().max(80))
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    firstName: addressText(80, "Vorname ist erforderlich."),
    lastName: addressText(80, "Nachname ist erforderlich."),
    company: emptyToUndef,
    line1: addressText(120, "Straße und Hausnummer sind erforderlich."),
    line2: emptyToUndef,
    zip: addressText(20, "PLZ ist erforderlich."),
    city: addressText(80, "Ort ist erforderlich."),
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
