"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  cancelWorkshopSession,
  completeWorkshopSession,
  duplicateWorkshopSessionAsDraft,
  getShopWorkshopSettingsForAdmin,
  publishWorkshopSession,
  updateShopWorkshopSettings,
  upsertWorkshopSessionDraft,
} from "@/features/workshops";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

export async function getWorkshopSettingsForAdminForm() {
  await requireAdmin();
  return getShopWorkshopSettingsForAdmin();
}

export type WorkshopSessionActionState =
  | { ok: true; id?: string; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

export async function saveWorkshopSessionDraftAction(
  _prev: WorkshopSessionActionState,
  formData: FormData,
): Promise<WorkshopSessionActionState> {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const maxSeats = formData.get("maxSeatsPerBooking");
  const selfCancel = formData.get("selfCancelHoursBeforeStart");

  const result = await upsertWorkshopSessionDraft({
    ...raw,
    maxSeatsPerBooking: maxSeats,
    selfCancelHoursBeforeStart: selfCancel,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${result.id}/edit`);
  redirect(`/admin/termine/${result.id}/edit?gespeichert=1`);
}

export async function publishWorkshopSessionAction(sessionId: string): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await publishWorkshopSession(sessionId);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  return { ok: true, id: sessionId, message: "Termin veröffentlicht." };
}

export async function cancelWorkshopSessionAction(sessionId: string): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await cancelWorkshopSession(sessionId);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  return { ok: true, id: sessionId, message: "Termin abgesagt." };
}

export async function completeWorkshopSessionAction(sessionId: string): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await completeWorkshopSession(sessionId);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  return { ok: true, id: sessionId, message: "Termin abgeschlossen." };
}

export async function duplicateWorkshopSessionAction(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  const result = await duplicateWorkshopSessionAsDraft(sessionId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  revalidatePath("/admin/termine");
  redirect(`/admin/termine/${result.id}/edit`);
}

export async function saveShopWorkshopSettingsAction(
  _prev: WorkshopSessionActionState,
  formData: FormData,
): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await updateShopWorkshopSettings({
    selfCancelHoursBeforeStart: formData.get("selfCancelHoursBeforeStart"),
  });
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  return { ok: true, message: "Einstellungen gespeichert." };
}
