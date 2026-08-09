import "server-only";

import { getPrisma } from "@/lib/db/prisma";

export type CustomerPortalProfile = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  verified: boolean;
};

/** Anzeigedaten des eigenen Kontos für Portalseiten (keine Sicherheitsmerkmale). */
export async function getCustomerProfileForPortal(
  customerId: string,
): Promise<CustomerPortalProfile | null> {
  const customer = await getPrisma().customer.findUnique({
    where: { id: customerId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      isActive: true,
    },
  });
  if (!customer) return null;

  return {
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    verified: Boolean(customer.emailVerifiedAt) && customer.isActive,
  };
}
