import { z } from "zod";
import {
  CUSTOMER_PASSWORD_MAX_LENGTH,
  CUSTOMER_PASSWORD_MIN_LENGTH,
} from "@/features/customers/domain/password";

export const customerEmailSchema = z
  .string()
  .trim()
  .min(1, "E-Mail ist erforderlich.")
  .email("Bitte eine gültige E-Mail-Adresse eingeben.")
  .transform((v) => v.toLowerCase());

export const customerPasswordSchema = z
  .string()
  .min(CUSTOMER_PASSWORD_MIN_LENGTH, `Mindestens ${CUSTOMER_PASSWORD_MIN_LENGTH} Zeichen.`)
  .max(CUSTOMER_PASSWORD_MAX_LENGTH, `Höchstens ${CUSTOMER_PASSWORD_MAX_LENGTH} Zeichen.`);

export const customerRegisterSchema = z.object({
  email: customerEmailSchema,
  password: customerPasswordSchema,
  firstName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  lastName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const customerPasswordLoginSchema = z.object({
  email: customerEmailSchema,
  password: z.string().min(1, "Passwort ist erforderlich."),
});

export const customerMagicLinkRequestSchema = z.object({
  email: customerEmailSchema,
});

export const customerPasswordResetRequestSchema = z.object({
  email: customerEmailSchema,
});

export const customerPasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: customerPasswordSchema,
});

export const customerAuthTokenSchema = z.object({
  token: z.string().min(1),
});
