import { z } from "zod";
import { customerPasswordSchema } from "@/features/customers";
import { isInsecureAdminPassword } from "@/lib/security/insecure-admin-passwords";

export const adminChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich."),
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
    if (isInsecureAdminPassword(data.password)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Dieses Passwort ist nicht erlaubt.",
      });
    }
  });
