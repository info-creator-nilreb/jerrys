import "server-only";

import { auth } from "@/auth";
import { getPrisma } from "@/lib/db/prisma";
import {
  resolveAdminAuthState,
  type AdminAuthState,
} from "@/lib/auth/resolve-admin-auth-state";

export type { AdminAuthState } from "@/lib/auth/resolve-admin-auth-state";
export { resolveAdminAuthState } from "@/lib/auth/resolve-admin-auth-state";

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "none" };

  const admin = await getPrisma().adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      credentialsChangedAt: true,
      mfaEnabled: true,
    },
  });

  return resolveAdminAuthState({ session, admin });
}
