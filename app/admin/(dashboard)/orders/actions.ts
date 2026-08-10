"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import type { ShippingCarrier } from "@/app/generated/prisma/client";
import { resendOrderEmailFromAdmin } from "@/lib/email/resend-order-email-from-admin";
import { applyOrderStatusTransition } from "@/lib/orders/apply-order-status-transition";
import { getPrisma } from "@/lib/db/prisma";
import { allocateInvoiceForOrderIfMissing } from "@/lib/invoice/allocate-invoice-for-order";
import { z } from "zod";

export type OrderStatusActionState = { error?: string; ok?: boolean } | null;

export type GenerateInvoiceState = { ok?: boolean; error?: string; message?: string } | null;

export type MarkOrderShippedState = { error?: string; ok?: boolean } | null;

const markShippedSchema = z.object({
  orderId: z.string().trim().min(1),
  carrier: z.enum(["DHL", "DPD", "UPS", "Hermes"]),
  trackingNumber: z.string().trim().min(4, "Sendungsnummer zu kurz.").max(120),
});

export type ResendOrderEmailState = { error?: string; ok?: boolean; message?: string } | null;

export type IssueOrderRefundActionState =
  | { error?: string; ok?: boolean; message?: string }
  | null;

const issueRefundSchema = z.object({
  orderId: z.string().trim().min(1),
  amountEuro: z.string().trim().optional(),
  note: z.string().trim().max(255).optional(),
  idempotencyKey: z.string().trim().min(8).max(38),
  manualOnly: z.enum(["0", "1"]).optional(),
});

export async function issueOrderRefundAction(
  _prev: IssueOrderRefundActionState,
  formData: FormData,
): Promise<IssueOrderRefundActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const parsed = issueRefundSchema.safeParse({
    orderId: formData.get("orderId"),
    amountEuro: formData.get("amountEuro") ?? undefined,
    note: formData.get("note") || undefined,
    idempotencyKey: formData.get("idempotencyKey"),
    manualOnly: formData.get("manualOnly") === "1" ? "1" : "0",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Ungültige Eingaben." };
  }

  const { orderId, note, idempotencyKey, manualOnly } = parsed.data;
  let amountCents: number | undefined;
  if (parsed.data.amountEuro != null && parsed.data.amountEuro !== "") {
    const { parseEuroInputToCents } = await import("@/lib/catalog/format");
    const cents = parseEuroInputToCents(parsed.data.amountEuro);
    if (cents == null || cents <= 0) {
      return { error: "Ungültiger Erstattungsbetrag." };
    }
    amountCents = cents;
  }

  const { issueOrderRefund } = await import("@/lib/orders/issue-order-refund");
  const result = await issueOrderRefund(getPrisma(), {
    orderId,
    amountCents,
    idempotencyKey,
    actor: "admin",
    note,
    manualOnly: manualOnly === "1",
  });

  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  const euros = (result.amountCents / 100).toFixed(2);
  if (result.alreadyProcessed) {
    return { ok: true, message: "Erstattung war bereits erfasst." };
  }
  if (result.full) {
    return {
      ok: true,
      message:
        result.provider === "paypal"
          ? `Vollständige PayPal-Erstattung über ${euros} € ausgeführt.`
          : `Bestellung manuell als erstattet markiert (${euros} €).`,
    };
  }
  return {
    ok: true,
    message: `Teilerstattung über ${euros} € ausgeführt. Rest: ${(result.remainingCents / 100).toFixed(2)} €.`,
  };
}

export async function updateOrderStatus(
  _prev: OrderStatusActionState,
  formData: FormData,
): Promise<OrderStatusActionState> {
  const session = await getAdminSession();
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
  const session = await getAdminSession();
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

export async function generateOrderInvoiceDocument(
  _prev: GenerateInvoiceState,
  formData: FormData,
): Promise<GenerateInvoiceState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }

  const result = await allocateInvoiceForOrderIfMissing(getPrisma(), orderId.trim());
  if (!result.ok) {
    if (result.error === "not_found") {
      return { error: "Bestellung nicht gefunden." };
    }
    return { error: "Für diese Bestellung kann keine Rechnung erzeugt werden." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.trim()}`);
  return {
    ok: true,
    message: result.created ? "Rechnung wurde erzeugt." : "Rechnung lag bereits vor.",
  };
}

export async function resendOrderEmail(
  _prev: ResendOrderEmailState,
  formData: FormData,
): Promise<ResendOrderEmailState> {
  const session = await getAdminSession();
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

export type ReconcilePayPalPaymentState =
  | { error?: string; ok?: boolean; message?: string }
  | null;

export async function reconcilePayPalPaymentForOrderAction(
  _prev: ReconcilePayPalPaymentState,
  formData: FormData,
): Promise<ReconcilePayPalPaymentState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }

  const { reconcilePendingPayPalPayments } = await import(
    "@/lib/orders/reconcile-pending-paypal-payments"
  );
  const result = await reconcilePendingPayPalPayments(getPrisma(), {
    orderId: orderId.trim(),
    limit: 1,
    source: "paypal_admin_reconcile",
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.trim()}`);

  const detail = result.details[0];
  if (!detail) {
    return {
      error:
        "Keine offenen PayPal-Zahlungen für diese Bestellung (nur Status „Zahlung ausstehend“).",
    };
  }

  if (detail.outcome === "finalized" || detail.outcome === "already_paid") {
    return {
      ok: true,
      message:
        detail.outcome === "already_paid"
          ? "Bestellung war bereits bezahlt."
          : "Zahlung bei PayPal gefunden und Bestellung finalisiert.",
    };
  }
  if (detail.outcome === "still_open") {
    return {
      ok: true,
      message: `PayPal meldet Status „${detail.paypalStatus ?? "offen"}“ — noch nicht abgeschlossen.`,
    };
  }
  if (detail.outcome === "skipped_unconfigured") {
    return { error: detail.message ?? "PayPal ist nicht konfiguriert." };
  }
  return {
    error: detail.message
      ? `Abgleich fehlgeschlagen: ${detail.message}`
      : "Abgleich fehlgeschlagen.",
  };
}
