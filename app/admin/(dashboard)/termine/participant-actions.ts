"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminCancelWorkshopBooking,
  setWorkshopBookingAttendanceForAdmin,
} from "@/features/workshops";
import { getAdminSession } from "@/lib/auth/admin-session";
import { revalidateStorefrontWorkshopSessions } from "@/lib/workshop/revalidate-storefront-workshop-sessions";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

export async function setWorkshopBookingAttendanceAction(
  bookingId: string,
  sessionId: string,
  status: "confirmed" | "attended" | "no_show",
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const result = await setWorkshopBookingAttendanceForAdmin({ bookingId, status });
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  revalidateStorefrontWorkshopSessions();
  return { ok: true };
}

export async function adminCancelWorkshopBookingAction(
  bookingId: string,
  sessionId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const result = await adminCancelWorkshopBooking({ bookingId });
  if (!result.ok) return result;
  revalidatePath("/admin/termine");
  revalidatePath(`/admin/termine/${sessionId}/edit`);
  revalidatePath("/admin/orders");
  revalidateStorefrontWorkshopSessions();
  return { ok: true, message: result.message };
}
