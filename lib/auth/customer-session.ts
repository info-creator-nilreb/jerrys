import "server-only";

import { auth } from "@/auth";
import { resolveAuthSubjectKind } from "@/features/customers";

export type CustomerSession = {
  customerId: string;
  email: string | null;
  name: string | null;
};

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (resolveAuthSubjectKind(session.user.subjectKind) !== "customer") return null;
  return {
    customerId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}
