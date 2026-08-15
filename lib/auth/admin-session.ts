import "server-only";

import { getAdminAuthState } from "@/lib/auth/admin-auth-state";

export async function getAdminSession() {
  const state = await getAdminAuthState();
  if (state.status !== "ready") return null;
  return state.session;
}
