import { hash } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import { sendCustomerAuthEmail } from "@/lib/email/customer-auth-email";
import { createLogger } from "@/lib/logging/logger";
import {
  customerAuthTokenExpiresAt,
  generateCustomerAuthTokenSecret,
  hashCustomerAuthToken,
} from "@/features/customers/domain/auth-token";
import { normalizeCustomerEmail } from "@/features/customers/domain/email";
import { customerRegisterSchema } from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.register");

export type RegisterCustomerResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Registers a customer with password. Always returns a generic success when the
 * email may already exist (anti-enumeration), except validation failures.
 */
export async function registerCustomer(input: unknown): Promise<RegisterCustomerResult> {
  const parsed = customerRegisterSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key]!.push(issue.message);
    }
    return { ok: false, message: "Bitte Eingaben prüfen.", fieldErrors };
  }

  const email = normalizeCustomerEmail(parsed.data.email);
  const passwordHash = await hash(parsed.data.password, 12);
  const prisma = getPrisma();

  const existing = await prisma.customer.findUnique({ where: { email } });
  const genericOk: RegisterCustomerResult = {
    ok: true,
    message:
      "Wenn die Adresse neu ist, haben wir dir eine Bestätigungs-E-Mail geschickt. Bitte prüfe dein Postfach.",
  };

  if (existing) {
    if (!existing.isActive) {
      log.warn("register_inactive_email", { customerId: existing.id });
      return genericOk;
    }
    if (!existing.emailVerifiedAt) {
      await issueAndSendToken({
        customerId: existing.id,
        email: existing.email,
        purpose: "email_verify",
      });
    }
    // Verified existing account: do not reveal; no email.
    return genericOk;
  }

  const customer = await prisma.customer.create({
    data: {
      email,
      passwordHash,
      firstName: parsed.data.firstName ?? null,
      lastName: parsed.data.lastName ?? null,
      identities: {
        create: {
          provider: "password",
          providerSubject: email,
        },
      },
    },
  });

  await issueAndSendToken({
    customerId: customer.id,
    email: customer.email,
    purpose: "email_verify",
  });

  log.info("customer_registered", { customerId: customer.id });
  return genericOk;
}

async function issueAndSendToken(params: {
  customerId: string;
  email: string;
  purpose: "email_verify";
}): Promise<void> {
  const prisma = getPrisma();
  const rawToken = generateCustomerAuthTokenSecret();
  const tokenHash = hashCustomerAuthToken(rawToken);
  await prisma.customerAuthToken.create({
    data: {
      customerId: params.customerId,
      purpose: params.purpose,
      tokenHash,
      expiresAt: customerAuthTokenExpiresAt(),
    },
  });
  await sendCustomerAuthEmail({
    kind: params.purpose,
    to: params.email,
    rawToken,
  });
}
