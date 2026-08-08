import { getPrisma } from "@/lib/db/prisma";
import { sendCustomerAuthEmail } from "@/lib/email/customer-auth-email";
import { createLogger } from "@/lib/logging/logger";
import {
  customerAuthTokenExpiresAt,
  generateCustomerAuthTokenSecret,
  hashCustomerAuthToken,
} from "@/features/customers/domain/auth-token";
import { normalizeCustomerEmail } from "@/features/customers/domain/email";
import { customerMagicLinkRequestSchema } from "@/features/customers/application/customer-auth-schemas";

const log = createLogger("customers.magic-link-request");

export type RequestMagicLinkResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Issues a magic-link token for an existing customer. Always returns a generic message.
 */
export async function requestCustomerMagicLink(input: unknown): Promise<RequestMagicLinkResult> {
  const parsed = customerMagicLinkRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }

  const email = normalizeCustomerEmail(parsed.data.email);
  const generic: RequestMagicLinkResult = {
    ok: true,
    message:
      "Wenn ein Konto zu dieser Adresse existiert, haben wir dir einen Anmelde-Link geschickt.",
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
      purpose: "magic_link",
      tokenHash: hashCustomerAuthToken(rawToken),
      expiresAt: customerAuthTokenExpiresAt(),
    },
  });

  await prisma.customerIdentity.upsert({
    where: {
      provider_providerSubject: {
        provider: "magic_link",
        providerSubject: email,
      },
    },
    create: {
      customerId: customer.id,
      provider: "magic_link",
      providerSubject: email,
    },
    update: {},
  });

  await sendCustomerAuthEmail({
    kind: "magic_link",
    to: customer.email,
    rawToken,
  });

  log.info("magic_link_issued", { customerId: customer.id });
  return generic;
}
