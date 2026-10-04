"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { revalidateStorefrontWorkshopSessions } from "@/lib/workshop/revalidate-storefront-workshop-sessions";
import {
  bulkPublishWorkshopSessionDrafts,
  bulkPublishWorkshopSessionDraftsBySeriesBatch,
  cancelWorkshopSession,
  completeWorkshopSession,
  createWorkshopSessionSeriesDrafts,
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

function formDataToSeriesPayload(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    ...raw,
    maxSeatsPerBooking: formData.get("maxSeatsPerBooking"),
    selfCancelHoursBeforeStart: formData.get("selfCancelHoursBeforeStart"),
    seriesStartsAtLocal: formData.getAll("seriesStartsAtLocal").map(String),
  };
}

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

export async function createWorkshopSessionSeriesAction(
  _prev: WorkshopSessionActionState,
  formData: FormData,
): Promise<WorkshopSessionActionState> {
  await requireAdmin();

  const result = await createWorkshopSessionSeriesDrafts(formDataToSeriesPayload(formData));
  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/termine");
  redirect(`/admin/termine?serieAngelegt=${result.count}&serieBatch=${result.batchId}`);
}

export async function bulkPublishWorkshopSessionsAction(
  sessionIds: string[],
): Promise<{ ok: true; publishedCount: number } | { ok: false; message: string }> {
  await requireAdmin();
  const result = await bulkPublishWorkshopSessionDrafts(sessionIds);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidateStorefrontWorkshopSessions();
  redirect(`/admin/termine?veroeffentlicht=${result.publishedCount}`);
}

export async function bulkPublishWorkshopSeriesBatchAction(
  batchId: string,
): Promise<{ ok: true; publishedCount: number } | { ok: false; message: string }> {
  await requireAdmin();
  const trimmed = batchId.trim();
  if (!trimmed) return { ok: false, message: "Serie unbekannt." };
  const result = await bulkPublishWorkshopSessionDraftsBySeriesBatch(trimmed);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidateStorefrontWorkshopSessions();
  redirect(`/admin/termine?veroeffentlicht=${result.publishedCount}`);
}

export async function publishWorkshopSessionAction(sessionId: string): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await publishWorkshopSession(sessionId);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  revalidateStorefrontWorkshopSessions();
  return { ok: true, id: sessionId, message: "Termin veröffentlicht." };
}

export async function cancelWorkshopSessionAction(sessionId: string): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await cancelWorkshopSession(sessionId);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  revalidateStorefrontWorkshopSessions();
  return { ok: true, id: sessionId, message: "Termin abgesagt." };
}

export async function completeWorkshopSessionAction(sessionId: string): Promise<WorkshopSessionActionState> {
  await requireAdmin();
  const result = await completeWorkshopSession(sessionId);
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  revalidateStorefrontWorkshopSessions();
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
    dateRequestTypicalMinSeats: formData.get("dateRequestTypicalMinSeats"),
    dateRequestTypicalMaxSeats: formData.get("dateRequestTypicalMaxSeats"),
  });
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidateStorefrontWorkshopSessions();
  return { ok: true, message: "Einstellungen gespeichert." };
}
