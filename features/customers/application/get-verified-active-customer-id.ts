import { getPrisma } from "@/lib/db/prisma";

/**
 * Returns customerId only when the account is active and email-verified.
 */
export async function getVerifiedActiveCustomerId(
  customerId: string,
): Promise<string | null> {
  const customer = await getPrisma().customer.findUnique({
    where: { id: customerId },
    select: { id: true, isActive: true, emailVerifiedAt: true },
  });
  if (!customer?.isActive || !customer.emailVerifiedAt) return null;
  return customer.id;
}
