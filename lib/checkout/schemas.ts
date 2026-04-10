import { z } from "zod";
import { nonEmptyString } from "@/lib/validation/form";

export const paymentMethodSchema = z.enum(["vorkasse", "paypal", "klarna"]);

export const checkoutFormSchema = z.object({
  email: z.string().trim().email({ message: "Gültige E-Mail erforderlich." }),
  shippingFirstName: nonEmptyString,
  shippingLastName: nonEmptyString,
  shippingCompany: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
  shippingLine1: nonEmptyString,
  shippingLine2: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
  shippingZip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Postleitzahl (5 Ziffern)."),
  shippingCity: nonEmptyString,
  shippingCountry: z.string().trim().min(2).max(2).default("DE"),
  phone: z.string().trim().optional().transform((s) => (s === "" ? undefined : s)),
  paymentMethod: paymentMethodSchema,
  idempotencyKey: z.string().uuid(),
});

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
