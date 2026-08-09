import { hash } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import { sendCustomerAuthEmail } from "@/lib/email/customer-auth-email";
import { createLogger } from "@/lib/logging/logger";
import {
  customerAuthTokenExpiresAt,
  generateCustomerAuthTokenSecret,
  hashCustomerAuthToken,
  isCustomerAuthTokenUsable,
} from "@/features/customers/domain/auth-token";
import { normalizeCustomerEmail } from "@/features/customers/domain/email";
import {
  customerPasswordResetConfirmSchema,
  customerPasswordResetRequestSchema,
} from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.password-reset");

export type PasswordResetRequestResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type PasswordResetConfirmResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function requestCustomerPasswordReset(
  input: unknown,
): Promise<PasswordResetRequestResult> {
  const parsed = customerPasswordResetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }

  const email = normalizeCustomerEmail(parsed.data.email);
  const generic: PasswordResetRequestResult = {
    ok: true,
    message:
      "Wenn ein Konto zu dieser Adresse existiert, haben wir dir einen Link zum Zurücksetzen geschickt.",
  };

  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer?.isActive) {
    return generic;
  }

  const rawToken = generateCustomerAuthTokenSecret();
  await prisma.customerAuthToken.create({
    data: {
      customerId: customer.id,
      purpose: "password_reset",
      tokenHash: hashCustomerAuthToken(rawToken),
      expiresAt: customerAuthTokenExpiresAt(),
    },
  });

  await sendCustomerAuthEmail({
    kind: "password_reset",
    to: customer.email,
    rawToken,
  });

  log.info("password_reset_issued", { customerId: customer.id });
  return generic;
}

export async function confirmCustomerPasswordReset(
  input: unknown,
): Promise<PasswordResetConfirmResult> {
  const parsed = customerPasswordResetConfirmSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key]!.push(issue.message);
    }
    return { ok: false, message: "Bitte Eingaben prüfen.", fieldErrors };
  }

  const tokenHash = hashCustomerAuthToken(parsed.data.token);
  const prisma = getPrisma();
  const row = await prisma.customerAuthToken.findUnique({
    where: { tokenHash },
    include: { customer: true },
  });

  if (!row || row.purpose !== "password_reset") {
    return { ok: false, message: "Ungültiger oder abgelaufener Reset-Link." };
  }
  if (!isCustomerAuthTokenUsable({ expiresAt: row.expiresAt, consumedAt: row.consumedAt })) {
    return { ok: false, message: "Ungültiger oder abgelaufener Reset-Link." };
  }
  if (!row.customer.isActive) {
    return { ok: false, message: "Dieses Konto ist deaktiviert." };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const now = new Date();
  const email = row.customer.email;

  await prisma.$transaction([
    prisma.customerAuthToken.update({
      where: { id: row.id },
      data: { consumedAt: now },
    }),
    prisma.customer.update({
      where: { id: row.customerId },
      data: {
        passwordHash,
        emailVerifiedAt: row.customer.emailVerifiedAt ?? now,
      },
    }),
  ]);

  await prisma.customerIdentity.upsert({
    where: {
      provider_providerSubject: {
        provider: "password",
        providerSubject: email,
      },
    },
    create: {
      customerId: row.customerId,
      provider: "password",
      providerSubject: email,
    },
    update: {},
  });

  log.info("password_reset_confirmed", { customerId: row.customerId });
  return {
    ok: true,
    message: "Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.",
  };
}
