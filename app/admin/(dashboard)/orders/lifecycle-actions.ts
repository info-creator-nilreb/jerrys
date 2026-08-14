"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteOrders, type OrderLifecycleResult } from "@/features/orders/server";
import { getAdminSession } from "@/lib/auth/admin-session";

async function requireAdminSession(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

export async function deleteOrderAction(orderId: string): Promise<OrderLifecycleResult> {
  await requireAdminSession();
  const result = await deleteOrders([orderId]);
  revalidatePath("/admin/orders");
  return result;
}

export async function bulkDeleteOrdersAction(orderIds: string[]): Promise<OrderLifecycleResult> {
  await requireAdminSession();
  const result = await deleteOrders(orderIds);
  revalidatePath("/admin/orders");
  return result;
}
