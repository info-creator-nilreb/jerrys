"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/admin-session";
import { disconnectInstagramConnection } from "@/lib/instagram/connection";
import { syncInstagramMediaFeed } from "@/lib/instagram/sync-media";

export type InstagramAdminActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
} | null;

async function requireAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

export async function disconnectInstagramAction(
  prev: InstagramAdminActionState,
  formData: FormData,
): Promise<InstagramAdminActionState> {
  void prev;
  void formData;
  if (!(await requireAdmin())) return { error: "Nicht angemeldet." };
  try {
    await disconnectInstagramConnection();
    revalidatePath("/admin/inhalte/marketing");
    revalidatePath("/");
    return { ok: true, message: "Instagram-Verbindung getrennt." };
  } catch {
    return { error: "Trennen fehlgeschlagen." };
  }
}

export async function syncInstagramNowAction(
  prev: InstagramAdminActionState,
  formData: FormData,
): Promise<InstagramAdminActionState> {
  void prev;
  void formData;
  if (!(await requireAdmin())) return { error: "Nicht angemeldet." };
  const result = await syncInstagramMediaFeed();
  revalidatePath("/admin/inhalte/marketing");
  revalidatePath("/");
  if (!result.ok) return { error: result.error };
  return {
    ok: true,
    message: `${result.synced} Bilder synchronisiert${result.skipped ? ` (${result.skipped} übersprungen)` : ""}.`,
  };
}
