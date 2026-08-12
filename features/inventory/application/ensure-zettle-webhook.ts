import "server-only";

import { createZettleClientFromConnection } from "@/features/inventory/infrastructure/zettle-client";
import {
  clearZettleWebhookSubscription,
  getZettleConnectionSecrets,
  saveZettleWebhookSubscription,
} from "@/features/inventory/infrastructure/zettle-connection";
import { generateUuidV1 } from "@/features/inventory/infrastructure/zettle-uuid-v1";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

const PURCHASE_EVENTS = ["PurchaseCreated"] as const;

export function getZettleWebhookDestinationUrl(): string | null {
  const origin = canonicalSiteOrigin().replace(/\/$/, "");
  if (!origin) return null;
  return `${origin}/api/webhooks/zettle`;
}

function webhookContactEmail(): string {
  return (
    process.env.ZETTLE_WEBHOOK_CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_SEED_EMAIL?.trim() ||
    "ops@localhost"
  );
}

/**
 * Stellt sicher, dass eine PurchaseCreated-Webhook-Subscription existiert.
 * Speichert signingKey verschlüsselt. Idempotent bei gleicher Destination.
 */
export async function ensureZettlePurchaseWebhook(): Promise<{
  ok: boolean;
  destination: string | null;
  message: string;
}> {
  const destination = getZettleWebhookDestinationUrl();
  if (!destination || destination.startsWith("http://127.")) {
    return {
      ok: false,
      destination,
      message:
        "Öffentliche HTTPS-URL fehlt (NEXT_PUBLIC_SITE_URL). Webhook wird beim nächsten Connect mit Production-URL eingerichtet.",
    };
  }

  const client = await createZettleClientFromConnection();
  const secrets = await getZettleConnectionSecrets();
  if (!client || !secrets) {
    return { ok: false, destination, message: "Zettle nicht verbunden." };
  }

  if (
    secrets.webhookSubscriptionUuid &&
    secrets.webhookSigningKey &&
    secrets.webhookDestination === destination
  ) {
    return { ok: true, destination, message: "Webhook bereits aktiv." };
  }

  try {
    const existing = await client.listPusherSubscriptions();
    const match = existing.find(
      (s) =>
        s.destination === destination &&
        s.eventNames.includes("PurchaseCreated"),
    );
    if (match?.signingKey) {
      await saveZettleWebhookSubscription({
        subscriptionUuid: match.uuid,
        signingKey: match.signingKey,
        destination,
      });
      return { ok: true, destination, message: "Bestehende Subscription übernommen." };
    }

    // Alte eigene Subscription löschen, wenn Destination gewechselt hat
    if (secrets.webhookSubscriptionUuid) {
      try {
        await client.deletePusherSubscription(secrets.webhookSubscriptionUuid);
      } catch {
        /* ignore */
      }
    }

    const created = await client.createPusherSubscription({
      uuid: generateUuidV1(),
      destination,
      contactEmail: webhookContactEmail(),
      eventNames: [...PURCHASE_EVENTS],
    });
    if (!created.signingKey) {
      return {
        ok: false,
        destination,
        message: "Subscription angelegt, aber ohne signingKey — bitte erneut verbinden.",
      };
    }
    await saveZettleWebhookSubscription({
      subscriptionUuid: created.uuid,
      signingKey: created.signingKey,
      destination,
    });
    return { ok: true, destination, message: "PurchaseCreated-Webhook eingerichtet." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook-Einrichtung fehlgeschlagen.";
    const detail =
      e && typeof e === "object" && "responseBody" in e
        ? String((e as { responseBody?: string }).responseBody ?? "").slice(0, 160)
        : "";
    return {
      ok: false,
      destination,
      message: detail ? `${msg} ${detail}` : msg,
    };
  }
}

export async function removeZettlePurchaseWebhook(): Promise<void> {
  const secrets = await getZettleConnectionSecrets();
  if (!secrets?.webhookSubscriptionUuid) {
    await clearZettleWebhookSubscription();
    return;
  }
  try {
    const client = await createZettleClientFromConnection();
    if (client) {
      await client.deletePusherSubscription(secrets.webhookSubscriptionUuid);
    }
  } catch {
    /* ignore remote errors */
  }
  await clearZettleWebhookSubscription();
}
