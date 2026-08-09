"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { selfCancelWorkshopBookingForCustomer } from "@/features/workshops";

const cancelSchema = z.object({
  bookingId: z.string().min(1),
  bestaetigt: z.literal("ja"),
});

export type CancelWorkshopBookingActionState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

export async function cancelWorkshopBookingAction(
  _prev: CancelWorkshopBookingActionState,
  formData: FormData,
): Promise<CancelWorkshopBookingActionState> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, message: "Bitte melde dich an." };
  }

  const parsed = cancelSchema.safeParse({
    bookingId: formData.get("bookingId"),
    bestaetigt: formData.get("bestaetigt"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Bitte bestätige die Stornierung." };
  }

  const result = await selfCancelWorkshopBookingForCustomer({
    customerId: session.customerId,
    bookingId: parsed.data.bookingId,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/konto/termine");
  revalidatePath(`/konto/termine/${parsed.data.bookingId}`);

  return {
    ok: true,
    message: result.alreadyCancelled
      ? "Diese Buchung war bereits storniert."
      : "Deine Buchung wurde storniert. Du erhältst eine Bestätigung per E-Mail, sobald der Versand eingerichtet ist.",
  };
}
