import { compare } from "bcryptjs";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import { normalizeCustomerEmail } from "@/features/customers/domain/email";
import { customerPasswordLoginSchema } from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.password-login");

export type AuthenticateCustomerPasswordResult =
  | {
      ok: true;
      customer: { id: string; email: string; name: string | null };
    }
  | { ok: false };

/**
 * Validates password credentials for Auth.js authorize(). Never reveals why login failed.
 */
export async function authenticateCustomerPassword(
  input: unknown,
): Promise<AuthenticateCustomerPasswordResult> {
  const parsed = customerPasswordLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const email = normalizeCustomerEmail(parsed.data.email);
  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({ where: { email } });

  if (!customer?.isActive || !customer.passwordHash || !customer.emailVerifiedAt) {
    log.warn("customer_login_rejected", { reason: "inactive_or_unverified_or_missing" });
    return { ok: false };
  }

  const valid = await compare(parsed.data.password, customer.passwordHash);
  if (!valid) {
    log.warn("customer_login_rejected", { reason: "bad_password", customerId: customer.id });
    return { ok: false };
  }

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email;

  return {
    ok: true,
    customer: { id: customer.id, email: customer.email, name },
  };
}

export async function markCustomerLoggedIn(customerId: string): Promise<void> {
  try {
    await getPrisma().customer.update({
      where: { id: customerId },
      data: { lastLoginAt: new Date() },
    });
  } catch (e) {
    log.warn("last_login_update_failed", { customerId, error: String(e) });
  }
}
