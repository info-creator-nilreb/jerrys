"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createWorkshopDateRequestForStorefront } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";

export type WorkshopDateRequestActionState =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

export async function submitWorkshopDateRequestAction(
  _prev: WorkshopDateRequestActionState,
  formData: FormData,
): Promise<WorkshopDateRequestActionState> {
  const session = await getCustomerSession();
  const raw = Object.fromEntries(formData.entries());

  const result = await createWorkshopDateRequestForStorefront(raw, {
    customerId: session?.customerId ?? null,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/termine/wunschtermin");
  redirect("/termine/wunschtermin?gesendet=1");
}
