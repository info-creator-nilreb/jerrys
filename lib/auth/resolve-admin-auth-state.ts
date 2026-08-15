import type { Session } from "next-auth";
import { resolveAuthSubjectKind } from "@/features/customers";

export type AdminAuthState =
  | { status: "none" }
  | { status: "mfa_pending"; session: Session }
  | { status: "ready"; session: Session };

export function resolveAdminAuthState(input: {
  session: Session | null;
  admin: {
    isActive: boolean;
    credentialsChangedAt: Date | null;
    mfaEnabled: boolean;
  } | null;
}): AdminAuthState {
  const session = input.session;
  if (!session?.user?.id) return { status: "none" };
  if (resolveAuthSubjectKind(session.user.subjectKind) !== "admin") {
    return { status: "none" };
  }
  if (!input.admin?.isActive) return { status: "none" };

  const issuedAt = session.user.credentialsIssuedAt;
  if (
    input.admin.credentialsChangedAt &&
    typeof issuedAt === "number" &&
    issuedAt < input.admin.credentialsChangedAt.getTime()
  ) {
    return { status: "none" };
  }

  if (session.user.mfaPending === true && input.admin.mfaEnabled) {
    return { status: "mfa_pending", session };
  }

  return { status: "ready", session };
}
