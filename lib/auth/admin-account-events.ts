import type { Prisma } from "@/app/generated/prisma/client";
import type { Prisma as PrismaTypes } from "@/app/generated/prisma/client";
import { appendIntegrationOutbox } from "@/features/integrations";

export const ADMIN_USER_PASSWORD_CHANGED = "admin_user.password_changed" as const;
export const ADMIN_USER_MFA_ENABLED = "admin_user.mfa_enabled" as const;
export const ADMIN_USER_MFA_DISABLED = "admin_user.mfa_disabled" as const;
export const ADMIN_USER_MFA_RECOVERY_USED = "admin_user.mfa_recovery_used" as const;
export const ADMIN_USER_MFA_RECOVERY_REGENERATED =
  "admin_user.mfa_recovery_regenerated" as const;

export async function appendAdminUserOutbox(
  tx: Pick<Prisma.TransactionClient, "integrationOutboxMessage">,
  params: {
    adminUserId: string;
    eventType: string;
    payload?: PrismaTypes.InputJsonValue;
  },
): Promise<void> {
  await appendIntegrationOutbox(tx, {
    aggregateType: "admin_user",
    aggregateId: params.adminUserId,
    eventType: params.eventType,
    payload: params.payload ?? { adminUserId: params.adminUserId },
  });
}
