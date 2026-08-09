"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { claimGuestOrdersForCustomer } from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";

export type ClaimGuestOrdersActionState = {
  ok: boolean;
  message: string;
} | null;

/**
 * Zuordnung nur auf ausdrückliche Bestätigung: Die Action wird von einem Formular
 * mit Vorschau ausgelöst, niemals automatisch beim Login oder Seitenaufruf.
 */
export async function claimGuestOrdersAction(
  _prev: ClaimGuestOrdersActionState,
  formData: FormData,
): Promise<ClaimGuestOrdersActionState> {
  // Bestätigung wird serverseitig verlangt, nicht nur in der UI.
  if (formData.get("bestaetigt") !== "ja") {
    return { ok: false, message: "Bitte die Zuordnung bestätigen." };
  }

  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const result = await claimGuestOrdersForCustomer(session.customerId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/konto");
  revalidatePath("/konto/bestellungen");
  redirect(`/konto/bestellungen?zugeordnet=${result.claimedCount}`);
}
