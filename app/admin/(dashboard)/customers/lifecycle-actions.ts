"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteCustomersByKeys,
  type CustomerLifecycleResult,
} from "@/lib/admin/customer-admin-lifecycle";
import { getAdminSession } from "@/lib/auth/admin-session";

async function requireAdminSession(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

export async function deleteCustomerAction(customerKey: string): Promise<CustomerLifecycleResult> {
  await requireAdminSession();
  const result = await deleteCustomersByKeys([customerKey]);
  revalidatePath("/admin/customers");
  return result;
}

export async function bulkDeleteCustomersAction(
  customerKeys: string[],
): Promise<CustomerLifecycleResult> {
  await requireAdminSession();
  const result = await deleteCustomersByKeys(customerKeys);
  revalidatePath("/admin/customers");
  return result;
}
