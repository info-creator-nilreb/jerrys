"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  approveWorkshopDateRequestForAdmin,
  rejectWorkshopDateRequestForAdmin,
} from "@/features/workshops";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

export type WorkshopDateRequestAdminActionState =
  | { ok: true; message?: string }
  | { ok: false; message: string }
  | null;

export async function approveWorkshopDateRequestAction(
  _prev: WorkshopDateRequestAdminActionState,
  formData: FormData,
): Promise<WorkshopDateRequestAdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await approveWorkshopDateRequestForAdmin({ id });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/termine/wunschtermine");
  revalidatePath("/admin/termine");
  if (result.sessionId) {
    redirect(`/admin/termine/${result.sessionId}/edit`);
  }
  return { ok: true };
}

export async function rejectWorkshopDateRequestAction(
  _prev: WorkshopDateRequestAdminActionState,
  formData: FormData,
): Promise<WorkshopDateRequestAdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const adminNote = formData.get("adminNote");
  const result = await rejectWorkshopDateRequestForAdmin({
    id,
    adminNote: adminNote == null ? undefined : String(adminNote),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/termine/wunschtermine");
  revalidatePath("/admin/termine");
  return { ok: true, message: "Anfrage abgelehnt." };
}
