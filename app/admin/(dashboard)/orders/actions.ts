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

export type InternetmarkeLabelActionState =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
      labelDownloadUrl?: string | null;
      trackingNumber?: string | null;
    }
  | null;

export async function purchaseInternetmarkeLabelForOrderAction(
  _prev: InternetmarkeLabelActionState,
  formData: FormData,
): Promise<InternetmarkeLabelActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }

  const {
    buildInternetmarkeSenderFromShopSettings,
    createShipmentDraftForOrder,
    createShippingLabelPort,
    findInternetmarkeProductPriceCents,
    isInternetmarkeConfigured,
    purchaseShippingLabelForShipment,
    resolveInternetmarkeConfig,
    updateInternetmarkeProductPriceCents,
  } = await import("@/features/fulfillment");
  const { getShopSettings } = await import("@/lib/shop/shop-settings");

  if (!(await isInternetmarkeConfigured())) {
    return {
      error:
        "INTERNETMARKE ist nicht konfiguriert. Unter Admin → Einstellungen → Integrationen verbinden und ein Porto-Produkt wählen.",
    };
  }

  let settings;
  try {
    settings = await getShopSettings();
  } catch {
    settings = null;
  }
  const senderResult = buildInternetmarkeSenderFromShopSettings(settings);
  if (!senderResult.ok) {
    return { error: senderResult.message };
  }

  const draft = await createShipmentDraftForOrder(getPrisma(), orderId.trim());
  let shipmentId: string;
  if (draft.ok) {
    shipmentId = draft.shipment.id;
  } else if (draft.error === "open_shipment_exists") {
    const open = await getPrisma().shipment.findFirst({
      where: {
        orderId: orderId.trim(),
        status: { in: ["draft", "labeled"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!open) {
      return { error: "Offene Sendung nicht gefunden." };
    }
    shipmentId = open.id;
  } else {
    const messages: Record<string, string> = {
      not_found: "Bestellung nicht gefunden.",
      no_physical_items: "Keine physischen Positionen — Label nicht nötig.",
      order_not_ready: "Bestellung ist noch nicht bereit für Versand.",
      already_fully_shipped: "Bestellung ist bereits versandt.",
      cancelled_or_refunded: "Stornierte/erstattete Bestellung.",
      open_shipment_exists: "Es gibt bereits eine offene Sendung mit Label — bitte zuerst prüfen.",
    };
    return { error: messages[draft.error] ?? "Sendung konnte nicht angelegt werden." };
  }

  const config = await resolveInternetmarkeConfig();
  const productCode = config?.productCode;
  let totalCents = config?.productPriceCents;
  if (config?.clientId && productCode != null) {
    const livePrice = await findInternetmarkeProductPriceCents(config.clientId, productCode);
    if (livePrice != null) {
      totalCents = livePrice;
      if (config.source === "db") {
        try {
          await updateInternetmarkeProductPriceCents(livePrice);
        } catch {
          /* Snapshot-Update optional */
        }
      }
    }
  }

  const port = await createShippingLabelPort();
  const purchased = await purchaseShippingLabelForShipment(getPrisma(), port, {
    shipmentId,
    sender: senderResult.sender,
    productCode,
    totalCents,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.trim()}`);

  if (!purchased.ok) {
    return { error: purchased.message };
  }

  return {
    ok: true,
    message: purchased.alreadyLabeled
      ? "Label war bereits vorhanden."
      : "Internetmarke wurde gekauft.",
    labelDownloadUrl: purchased.labelDownloadUrl,
    trackingNumber: purchased.trackingNumber,
  };
}

export async function voidInternetmarkeLabelAction(
  _prev: InternetmarkeLabelActionState,
  formData: FormData,
): Promise<InternetmarkeLabelActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  const shipmentId = formData.get("shipmentId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }
  if (typeof shipmentId !== "string" || !shipmentId.trim()) {
    return { error: "Ungültige Sendung." };
  }

  const { createShippingLabelPort, voidShippingLabelForShipment } = await import(
    "@/features/fulfillment"
  );

  const port = await createShippingLabelPort();
  const voided = await voidShippingLabelForShipment(getPrisma(), port, shipmentId.trim());

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId.trim()}`);

  if (!voided.ok) {
    return { error: voided.message };
  }

  return { ok: true, message: "Label / Sendung wurde storniert (Retoure beim Anbieter)." };
}

export type ReshipShipmentActionState =
  | null
  | { ok: true; message: string; shipmentId: string }
  | { error: string };

export type MarkShipmentReturnedActionState =
  | null
  | { ok: true; message: string }
  | { error: string };

/**
 * Markiert eine Sendung (und ggf. die Bestellung) als Retoure — auditierbar.
 */
export async function markOrderShipmentReturnedAction(
  _prev: MarkShipmentReturnedActionState,
  formData: FormData,
): Promise<MarkShipmentReturnedActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  const shipmentId = formData.get("shipmentId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }
  if (typeof shipmentId !== "string" || !shipmentId.trim()) {
    return { error: "Ungültige Sendung." };
  }

  const oid = orderId.trim();
  const sid = shipmentId.trim();
  const prisma = getPrisma();

  const order = await prisma.order.findUnique({
    where: { id: oid },
    select: { id: true, status: true },
  });
  if (!order) {
    return { error: "Bestellung nicht gefunden." };
  }

  const { isAllowedOrderStatusTransition } = await import("@/lib/orders/order-status-machine");
  const { createOrderEvent, ORDER_EVENT_SHIPMENT_RETURNED } = await import(
    "@/lib/orders/order-events"
  );

  if (isAllowedOrderStatusTransition(order.status, "retoure")) {
    const result = await applyOrderStatusTransition(prisma, oid, "retoure");
    if (!result.ok) {
      if (result.error === "insufficient_warehouse") {
        return {
          error:
            "Lagerbestand konnte bei Retoure nicht zurückgebucht werden — bitte Bestände prüfen.",
        };
      }
      return { error: "Retoure-Statuswechsel ist nicht erlaubt." };
    }
    await createOrderEvent(prisma, oid, ORDER_EVENT_SHIPMENT_RETURNED, {
      shipmentId: sid,
      via: "order_status_retoure",
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${oid}`);
    return {
      ok: true,
      message: "Retoure erfasst — Sendungen und Bestellstatus wurden aktualisiert.",
    };
  }

  const { markShipmentReturned } = await import("@/features/fulfillment");
  const marked = await markShipmentReturned(prisma, sid);
  if (!marked.ok) {
    return { error: marked.message };
  }
  if (marked.orderId !== oid) {
    return { error: "Sendung gehört nicht zu dieser Bestellung." };
  }

  if (!marked.alreadyReturned) {
    await createOrderEvent(prisma, oid, ORDER_EVENT_SHIPMENT_RETURNED, {
      shipmentId: sid,
      via: "shipment_only",
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${oid}`);
  return {
    ok: true,
    message: marked.alreadyReturned
      ? "Sendung war bereits als Retoure markiert."
      : "Sendung als Retoure markiert.",
  };
}

/**
 * Legt einen neuen Sendungsentwurf für erneute Versendung an (nach Retoure).
 * Nutzt `forceNew` und schreibt ein Audit-Event; bei Bestellstatus Retoure → processing.
 */
export async function createReshipShipmentDraftAction(
  _prev: ReshipShipmentActionState,
  formData: FormData,
): Promise<ReshipShipmentActionState> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Ungültige Bestellung." };
  }

  const oid = orderId.trim();
  const prisma = getPrisma();
  const { createReshipmentDraftForOrder } = await import("@/features/fulfillment");
  const { createOrderEvent, ORDER_EVENT_SHIPMENT_RESHIP_DRAFT } = await import(
    "@/lib/orders/order-events"
  );

  const draft = await createReshipmentDraftForOrder(prisma, oid);

  if (!draft.ok) {
    const messages: Record<string, string> = {
      not_found: "Bestellung nicht gefunden.",
      no_physical_items: "Keine physischen Positionen — erneute Versendung nicht nötig.",
      order_not_ready: "Bestellung ist für erneute Versendung nicht bereit.",
      already_fully_shipped: "Bitte zuerst Retoure setzen oder bestehenden Entwurf prüfen.",
      cancelled_or_refunded: "Stornierte/erstattete Bestellung.",
      open_shipment_exists:
        "Es gibt bereits eine offene Sendung mit Label — bitte zuerst stornieren.",
      reship_not_applicable:
        draft.message ??
        "Erneute Sendung erst nach Retoure möglich (Lieferstatus Retoure setzen).",
    };
    return { error: messages[draft.error] ?? "Reship-Entwurf konnte nicht angelegt werden." };
  }

  await createOrderEvent(prisma, oid, ORDER_EVENT_SHIPMENT_RESHIP_DRAFT, {
    shipmentId: draft.shipment.id,
    reusedExisting: !draft.created,
    forceNew: true,
  });

  const order = await prisma.order.findUnique({
    where: { id: oid },
    select: { status: true },
  });
  if (order?.status === "retoure") {
    const transition = await applyOrderStatusTransition(prisma, oid, "processing");
    if (!transition.ok) {
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${oid}`);
      return {
        ok: true,
        shipmentId: draft.shipment.id,
        message:
          "Sendungsentwurf angelegt, aber Status konnte nicht auf „In Bearbeitung“ gesetzt werden — bitte manuell prüfen.",
      };
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${oid}`);

  return {
    ok: true,
    shipmentId: draft.shipment.id,
    message: draft.created
      ? "Neuer Sendungsentwurf für erneute Versendung angelegt."
      : "Bestehender Sendungsentwurf wird für die erneute Versendung genutzt.",
  };
}
