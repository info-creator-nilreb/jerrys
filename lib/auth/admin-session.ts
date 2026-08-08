import "server-only";

import { auth } from "@/auth";
import { resolveAuthSubjectKind } from "@/features/customers";

export async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (resolveAuthSubjectKind(session.user.subjectKind) !== "admin") return null;
  return session;
}
