import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import {
  hashCustomerAuthToken,
  isCustomerAuthTokenUsable,
  normalizeCustomerAuthTokenFromClient,
} from "@/features/customers/domain/auth-token";
import { customerAuthTokenSchema } from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.verify-email");

export type VerifyCustomerEmailResult =
  | { ok: true; customerId: string; email: string }
  | { ok: false; message: string };

export async function verifyCustomerEmail(input: unknown): Promise<VerifyCustomerEmailResult> {
  const raw =
    input && typeof input === "object" && "token" in input
      ? String((input as { token: unknown }).token)
      : "";
  const normalized = normalizeCustomerAuthTokenFromClient(raw);
  const parsed = customerAuthTokenSchema.safeParse({ token: normalized });
  if (!parsed.success) {
    log.warn("verify_email_invalid_token_input", { hasToken: normalized.length > 0 });
    return { ok: false, message: "Ungültiger Bestätigungslink." };
  }

  const tokenHash = hashCustomerAuthToken(parsed.data.token);
  const prisma = getPrisma();
  const row = await prisma.customerAuthToken.findUnique({
    where: { tokenHash },
    include: { customer: true },
  });

  if (!row || row.purpose !== "email_verify") {
    log.warn("verify_email_token_not_found", { purpose: row?.purpose ?? null });
    return { ok: false, message: "Ungültiger oder abgelaufener Bestätigungslink." };
  }
  if (!isCustomerAuthTokenUsable({ expiresAt: row.expiresAt, consumedAt: row.consumedAt })) {
    log.warn("verify_email_token_not_usable", {
      customerId: row.customerId,
      consumed: Boolean(row.consumedAt),
      expired: row.expiresAt.getTime() <= Date.now(),
    });
    return { ok: false, message: "Ungültiger oder abgelaufener Bestätigungslink." };
  }
  if (!row.customer.isActive) {
    return { ok: false, message: "Dieses Konto ist deaktiviert." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.customerAuthToken.update({
      where: { id: row.id },
      data: { consumedAt: now },
    }),
    prisma.customer.update({
      where: { id: row.customerId },
      data: {
        emailVerifiedAt: row.customer.emailVerifiedAt ?? now,
      },
    }),
  ]);

  log.info("customer_email_verified", { customerId: row.customerId });
  return { ok: true, customerId: row.customerId, email: row.customer.email };
}
