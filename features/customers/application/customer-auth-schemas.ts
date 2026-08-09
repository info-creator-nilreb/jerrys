import { z } from "zod";
import {
  CUSTOMER_PASSWORD_MAX_LENGTH,
  CUSTOMER_PASSWORD_MIN_LENGTH,
  validateCustomerPassword,
} from "@/features/customers/domain/password";

export const customerEmailSchema = z
  .string()
  .trim()
  .min(1, "E-Mail ist erforderlich.")
  .email("Bitte eine gültige E-Mail-Adresse eingeben.")
  .transform((v) => v.toLowerCase());

export const customerPasswordSchema = z
  .string()
  .min(1, "Passwort ist erforderlich.")
  .max(CUSTOMER_PASSWORD_MAX_LENGTH, `Höchstens ${CUSTOMER_PASSWORD_MAX_LENGTH} Zeichen.`)
  .superRefine((value, ctx) => {
    const check = validateCustomerPassword(value);
    if (!check.ok) {
      ctx.addIssue({ code: "custom", message: check.message });
    }
  });

export const customerRegisterSchema = z
  .object({
    email: customerEmailSchema,
    password: customerPasswordSchema,
    passwordConfirm: z.string().min(1, "Bitte Passwort wiederholen."),
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
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "Passwörter stimmen nicht überein.",
      });
    }
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

export const customerPasswordResetConfirmSchema = z
  .object({
    token: z.string().min(1),
    password: customerPasswordSchema,
    passwordConfirm: z.string().min(1, "Bitte Passwort wiederholen."),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "Passwörter stimmen nicht überein.",
      });
    }
  });

export const customerAuthTokenSchema = z.object({
  token: z.string().min(1),
});

// Re-export for tests documenting min length constant usage
export { CUSTOMER_PASSWORD_MIN_LENGTH };
