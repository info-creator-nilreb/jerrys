"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import {
  anonymizeCustomerAccount,
  updateCustomerProfile,
  CUSTOMER_DELETE_CONFIRMATION,
} from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";

export type CustomerPrivacyActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function updateCustomerProfileAction(
  _prev: CustomerPrivacyActionState,
  formData: FormData,
): Promise<CustomerPrivacyActionState> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, message: "Bitte zuerst anmelden." };

  const result = await updateCustomerProfile(session.customerId, {
    firstName: formData.get("firstName") ?? undefined,
    lastName: formData.get("lastName") ?? undefined,
  });
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }

  revalidatePath("/konto");
  revalidatePath("/konto/datenschutz");
  return { ok: true, message: "Angaben gespeichert." };
}

/**
 * Löschung erst nach ausdrücklicher Bestätigung: Das Bestätigungswort wird serverseitig
 * geprüft, nicht nur in der UI.
 */
export async function anonymizeCustomerAccountAction(
  _prev: CustomerPrivacyActionState,
  formData: FormData,
): Promise<CustomerPrivacyActionState> {
  const confirmation = String(formData.get("bestaetigung") ?? "")
    .trim()
    .toUpperCase();
  if (confirmation !== CUSTOMER_DELETE_CONFIRMATION) {
    return {
      ok: false,
      message: `Bitte „${CUSTOMER_DELETE_CONFIRMATION}“ eingeben, um die Löschung zu bestätigen.`,
    };
  }

  const session = await getCustomerSession();
  if (!session) return { ok: false, message: "Bitte zuerst anmelden." };

  const result = await anonymizeCustomerAccount(session.customerId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  // Session verwerfen: Das Konto ist danach nicht mehr anmeldbar.
  await signOut({ redirectTo: "/?konto=geloescht" });
  redirect("/?konto=geloescht");
}
