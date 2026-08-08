import { NextResponse } from "next/server";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  extractPayPalOrderIdFromWebhookEvent,
  paypalWebhookIdConfigured,
  readPayPalWebhookHeaders,
  verifyPayPalWebhookSignature,
} from "@/lib/payments/paypal-webhook-verify";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalWebhookRateLimitJsonHeaders,
  touchPayPalWebhookApiAttempt,
} from "@/lib/security/paypal-webhook-api-rate-limit";
import {
  beginWebhookInboxProcessing,
  markWebhookInboxFailed,
  markWebhookInboxProcessed,
} from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";

const log = createLogger("webhooks.paypal");

const HANDLED_EVENT_TYPES = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "CHECKOUT.ORDER.APPROVED",
]);

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

/**
 * PayPal Webhooks (Doppel-Absicherung zur Return-URL).
 * Dashboard: Webhook-URL → `/api/webhooks/paypal`, Event u. a. `PAYMENT.CAPTURE.COMPLETED`.
 */
export async function POST(req: Request) {
  const limited = touchPayPalWebhookApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: payPalWebhookRateLimitJsonHeaders(limited.retryAfterSec) },
    );
  }

  if (!paypalWebhookIdConfigured()) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const headers = readPayPalWebhookHeaders(req.headers);
  if (!headers) {
    return NextResponse.json({ error: "missing_headers" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await verifyPayPalWebhookSignature({
      headers,
      webhookEvent: event,
    });
  } catch (e) {
    log.error("paypal_webhook_verify_failed", errorMeta(e));
    return NextResponse.json({ error: "verify_failed" }, { status: 502 });
  }

  if (!verified) {
    log.warn("paypal_webhook_invalid_signature", {
      transmissionId: headers.transmissionId,
      eventId: event.id ?? null,
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const eventId = event.id?.trim();
  if (!eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }

  const prisma = getPrisma();
  const inbox = await beginWebhookInboxProcessing(prisma, {
    provider: "paypal_webhook",
    externalEventId: eventId,
    metadata: { event_type: event.event_type ?? null },
  });
  if (!inbox.ok) {
    return NextResponse.json({ error: "inbox_race" }, { status: 503 });
  }
  if (inbox.duplicate && inbox.alreadyProcessed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const eventType = event.event_type ?? "";
    if (!HANDLED_EVENT_TYPES.has(eventType)) {
      await markWebhookInboxProcessed(prisma, inbox.entryId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const paypalOrderId = extractPayPalOrderIdFromWebhookEvent(event);
    if (!paypalOrderId) {
      log.warn("paypal_webhook_no_order_id", { eventId, eventType });
      await markWebhookInboxProcessed(prisma, inbox.entryId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await completePayPalCaptureFlow(paypalOrderId, {
      eventSource: "paypal_webhook",
    });
    if (!result.ok) {
      log.error("paypal_webhook_finalize_issue", {
        eventId,
        paypalOrderId,
        code: result.code,
      });
      await markWebhookInboxFailed(prisma, inbox.entryId);
      return NextResponse.json({ error: result.code }, { status: 500 });
    }

    await markWebhookInboxProcessed(prisma, inbox.entryId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await markWebhookInboxFailed(prisma, inbox.entryId);
    log.error("paypal_webhook_processing_failed", { eventId, ...errorMeta(e) });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
