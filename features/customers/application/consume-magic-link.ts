import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import {
  hashCustomerAuthToken,
  isCustomerAuthTokenUsable,
} from "@/features/customers/domain/auth-token";
import { customerAuthTokenSchema } from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.magic-link-consume");

export type ConsumeMagicLinkResult =
  | {
      ok: true;
      customer: { id: string; email: string; name: string | null };
    }
  | { ok: false; message: string };

/**
 * Consumes a magic-link token, marks email verified, returns Auth.js user payload.
 */
export async function consumeCustomerMagicLink(input: unknown): Promise<ConsumeMagicLinkResult> {
  const parsed = customerAuthTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Ungültiger Anmelde-Link." };
  }

  const tokenHash = hashCustomerAuthToken(parsed.data.token);
  const prisma = getPrisma();
  const row = await prisma.customerAuthToken.findUnique({
    where: { tokenHash },
    include: { customer: true },
  });

  if (!row || row.purpose !== "magic_link") {
    return { ok: false, message: "Ungültiger oder abgelaufener Anmelde-Link." };
  }
  if (!isCustomerAuthTokenUsable({ expiresAt: row.expiresAt, consumedAt: row.consumedAt })) {
    return { ok: false, message: "Ungültiger oder abgelaufener Anmelde-Link." };
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
        lastLoginAt: now,
      },
    }),
  ]);

  const name =
    [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" ").trim() ||
    row.customer.email;

  log.info("magic_link_consumed", { customerId: row.customerId });
  return {
    ok: true,
    customer: { id: row.customerId, email: row.customer.email, name },
  };
}
