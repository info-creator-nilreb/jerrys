import { NextResponse } from "next/server";
import {
  applyZettlePurchase,
  getZettleConnectionSecrets,
  syncZettlePurchaseByUuid,
  verifyZettleWebhookSignature,
  type ZettlePurchase,
} from "@/features/inventory";
import {
  beginWebhookInboxProcessing,
  markWebhookInboxFailed,
  markWebhookInboxProcessed,
} from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("webhooks.zettle");

type ZettlePusherEvent = {
  eventName?: string;
  organizationUuid?: string;
  messageId?: string;
  timestamp?: string;
  /** JSON-String oder bereits geparstes Objekt. */
  payload?: string | Record<string, unknown>;
};

function payloadAsString(payload: ZettlePusherEvent["payload"]): string {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") return JSON.stringify(payload);
  return "";
}

function parsePurchasePayload(payload: ZettlePusherEvent["payload"]): ZettlePurchase | null {
  try {
    if (typeof payload === "string") {
      return JSON.parse(payload) as ZettlePurchase;
    }
    if (payload && typeof payload === "object") {
      return payload as ZettlePurchase;
    }
  } catch {
    return null;
  }
  return null;
}

function purchaseUuidFromPayload(purchase: ZettlePurchase): string | null {
  const id = (purchase.purchaseUUID1 || purchase.purchaseUUID || "").trim();
  return id || null;
}

/**
 * Zettle Pusher Webhook (PurchaseCreated).
 * Signatur: HMAC-SHA256(signingKey, `${timestamp}.${payload}`) vs X-iZettle-Signature.
 */
export async function POST(req: Request) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let event: ZettlePusherEvent;
  try {
    event = JSON.parse(rawBody) as ZettlePusherEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Init-Test von Zettle beim Anlegen der Subscription
  if (event.eventName === "TestMessage") {
    return NextResponse.json({ ok: true, test: true });
  }

  const secrets = await getZettleConnectionSecrets();
  if (!secrets?.webhookSigningKey) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const payloadStr = payloadAsString(event.payload);
  const timestamp = event.timestamp ?? "";
  const signature = req.headers.get("x-izettle-signature") ?? req.headers.get("X-iZettle-Signature");

  const valid = verifyZettleWebhookSignature({
    signingKey: secrets.webhookSigningKey,
    timestamp,
    payload: payloadStr,
    signatureHeader: signature,
  });
  if (!valid) {
    log.warn("zettle_webhook_invalid_signature", { eventName: event.eventName });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (event.eventName !== "PurchaseCreated") {
    return NextResponse.json({ ok: true, ignored: event.eventName ?? "unknown" });
  }

  const messageId = event.messageId?.trim() || `ts:${timestamp}`;
  const prisma = getPrisma();
  const inbox = await beginWebhookInboxProcessing(prisma, {
    provider: "zettle_pusher",
    externalEventId: messageId,
    metadata: { eventName: event.eventName, organizationUuid: event.organizationUuid },
  });

  if (!inbox.ok) {
    return NextResponse.json({ error: "inbox_race" }, { status: 503 });
  }
  if (inbox.duplicate && inbox.alreadyProcessed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const purchase = parsePurchasePayload(event.payload);
    let result;
    if (purchase) {
      const uuid = purchaseUuidFromPayload(purchase);
      if (uuid) {
        result = await applyZettlePurchase(purchase);
      } else {
        result = { status: "skipped" as const, reason: "Payload ohne purchase UUID." };
      }
    } else {
      // Fallback: UUID aus Payload-String extrahieren und nachladen
      const loose = payloadStr.match(
        /"purchaseUUID1"\s*:\s*"([^"]+)"|"purchaseUUID"\s*:\s*"([^"]+)"/,
      );
      const uuid = loose?.[1] || loose?.[2];
      if (!uuid) {
        throw new Error("PurchaseCreated ohne parsebares Kauf-Objekt.");
      }
      result = await syncZettlePurchaseByUuid(uuid);
    }

    if (result.status === "failed") {
      await markWebhookInboxFailed(prisma, inbox.entryId);
      log.warn("zettle_webhook_purchase_failed", { reason: result.reason, messageId });
      // 200 damit Zettle nicht endlos retried — Fehler liegt in Sync-Tabelle
      return NextResponse.json({ ok: true, applied: result.status, reason: result.reason });
    }

    await markWebhookInboxProcessed(prisma, inbox.entryId);
    return NextResponse.json({ ok: true, applied: result.status });
  } catch (e) {
    log.error("zettle_webhook_processing_failed", errorMeta(e));
    await markWebhookInboxFailed(prisma, inbox.entryId);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
