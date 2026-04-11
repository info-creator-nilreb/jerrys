"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { applyOrderStatusTransition } from "@/lib/orders/apply-order-status-transition";
import { getPrisma } from "@/lib/db/prisma";

export type OrderStatusActionState = { error?: string; ok?: boolean } | null;

export async function updateOrderStatus(
  _prev: OrderStatusActionState,
  formData: FormData,
): Promise<OrderStatusActionState> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  const toStatus = formData.get("toStatus");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }
  if (typeof toStatus !== "string" || !toStatus.trim()) {
    return { error: "Ungültiger Status." };
  }

  const result = await applyOrderStatusTransition(getPrisma(), orderId.trim(), toStatus.trim());

  if (!result.ok) {
    if (result.error === "not_found") {
      return { error: "Bestellung nicht gefunden." };
    }
    return { error: "Statuswechsel ist nicht erlaubt." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.trim()}`);
  return { ok: true };
}
