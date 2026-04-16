"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { ShippingCarrier } from "@/app/generated/prisma/client";
import { resendOrderEmailFromAdmin } from "@/lib/email/resend-order-email-from-admin";
import { applyOrderStatusTransition } from "@/lib/orders/apply-order-status-transition";
import { getPrisma } from "@/lib/db/prisma";
import { z } from "zod";

export type OrderStatusActionState = { error?: string; ok?: boolean } | null;

export type MarkOrderShippedState = { error?: string; ok?: boolean } | null;

const markShippedSchema = z.object({
  orderId: z.string().trim().min(1),
  carrier: z.enum(["DHL", "DPD", "UPS", "Hermes"]),
  trackingNumber: z.string().trim().min(4, "Sendungsnummer zu kurz.").max(120),
});

export type ResendOrderEmailState = { error?: string; ok?: boolean; message?: string } | null;

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

  const ts = toStatus.trim();
  if (ts === "shipped") {
    return {
      error:
        "Für „Versandt“ bitte das Formular „Versand melden“ mit Sendungsnummer und Versanddienst verwenden.",
    };
  }

  const result = await applyOrderStatusTransition(getPrisma(), orderId.trim(), ts);

  if (!result.ok) {
    if (result.error === "not_found") {
      return { error: "Bestellung nicht gefunden." };
    }
    if (result.error === "insufficient_warehouse") {
      return {
        error:
          "Lagerbestand reicht für mindestens eine Position nicht — bitte Produktbestände prüfen oder Mengen anpassen.",
      };
    }
    if (result.error === "shipment_required") {
      return { error: "Bitte Versanddienst und Sendungsnummer angeben." };
    }
    return { error: "Statuswechsel ist nicht erlaubt." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.trim()}`);
  return { ok: true };
}

export async function markOrderShippedWithDetails(
  _prev: MarkOrderShippedState,
  formData: FormData,
): Promise<MarkOrderShippedState> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const parsed = markShippedSchema.safeParse({
    orderId: formData.get("orderId"),
    carrier: formData.get("shippingCarrier"),
    trackingNumber: formData.get("trackingNumber"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Ungültige Eingaben." };
  }

  const { orderId, carrier, trackingNumber } = parsed.data;
  const result = await applyOrderStatusTransition(getPrisma(), orderId, "shipped", {
    shipment: {
      carrier: carrier as ShippingCarrier,
      trackingNumber,
    },
  });

  if (!result.ok) {
    if (result.error === "not_found") {
      return { error: "Bestellung nicht gefunden." };
    }
    if (result.error === "insufficient_warehouse") {
      return {
        error:
          "Lagerbestand reicht für mindestens eine Position nicht — bitte Produktbestände prüfen oder Mengen anpassen.",
      };
    }
    if (result.error === "shipment_required") {
      return { error: "Bitte Versanddienst und Sendungsnummer angeben." };
    }
    return { error: "Statuswechsel ist nicht erlaubt." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function resendOrderEmail(
  _prev: ResendOrderEmailState,
  formData: FormData,
): Promise<ResendOrderEmailState> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  const emailType = formData.get("emailType");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }
  if (typeof emailType !== "string" || !emailType.trim()) {
    return { error: "Ungültiger E-Mail-Typ." };
  }

  try {
    const result = await resendOrderEmailFromAdmin(orderId.trim(), emailType.trim());
    if (!result.ok) {
      return { error: result.error };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId.trim()}`);
    return { ok: true, message: result.message };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Unerwarteter Fehler beim erneuten Senden." };
  }
}
