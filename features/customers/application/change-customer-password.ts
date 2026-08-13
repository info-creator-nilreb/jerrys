import { compare, hash } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import { customerChangePasswordSchema } from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.change-password");

export type ChangeCustomerPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Self-Service Passwort ändern (eingeloggter Kunde).
 * Neues Passwort + Bestätigung wie Registrierung; aktuelles Passwort
 * nur nötig, wenn bereits ein Passwort gesetzt ist.
 */
export async function changeCustomerPassword(
  customerId: string,
  input: unknown,
): Promise<ChangeCustomerPasswordResult> {
  const id = customerId.trim();
  if (!id) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  const parsed = customerChangePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key]!.push(issue.message);
    }
    return { ok: false, message: "Bitte Eingaben prüfen.", fieldErrors };
  }

  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!customer?.isActive) {
    return { ok: false, message: "Konto nicht verfügbar." };
  }

  const { currentPassword, password } = parsed.data;

  if (customer.passwordHash) {
    if (!currentPassword) {
      return {
        ok: false,
        message: "Bitte Eingaben prüfen.",
        fieldErrors: {
          currentPassword: ["Aktuelles Passwort ist erforderlich."],
        },
      };
    }
    const valid = await compare(currentPassword, customer.passwordHash);
    if (!valid) {
      return {
        ok: false,
        message: "Bitte Eingaben prüfen.",
        fieldErrors: {
          currentPassword: ["Aktuelles Passwort ist nicht korrekt."],
        },
      };
    }
    const sameAsOld = await compare(password, customer.passwordHash);
    if (sameAsOld) {
      return {
        ok: false,
        message: "Bitte Eingaben prüfen.",
        fieldErrors: {
          password: ["Das neue Passwort muss sich vom aktuellen unterscheiden."],
        },
      };
    }
  }

  const passwordHash = await hash(password, 12);
  const email = customer.email;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash },
    }),
    prisma.customerIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider: "password",
          providerSubject: email,
        },
      },
      create: {
        customerId: customer.id,
        provider: "password",
        providerSubject: email,
      },
      update: {},
    }),
  ]);

  log.info("customer_password_changed", { customerId: customer.id });
  return { ok: true, message: "Dein Passwort wurde aktualisiert." };
}
