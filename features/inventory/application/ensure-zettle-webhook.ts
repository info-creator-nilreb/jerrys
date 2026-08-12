import "server-only";

import { createZettleClientFromConnection } from "@/features/inventory/infrastructure/zettle-client";
import {
  clearZettleWebhookSubscription,
  getZettleConnectionSecrets,
  saveZettleWebhookSubscription,
} from "@/features/inventory/infrastructure/zettle-connection";
import { generateUuidV1 } from "@/features/inventory/infrastructure/zettle-uuid-v1";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

const PURCHASE_EVENTS = ["PurchaseCreated"] as const;

/** Einfache E-Mail-Prüfung (Zettle verlangt gültige Adresse, kein @localhost). */
function isValidContactEmail(raw: string | null | undefined): raw is string {
  const email = raw?.trim() ?? "";
  if (!email || email.length > 200) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const host = email.split("@")[1]?.toLowerCase() ?? "";
  if (host === "localhost" || host.endsWith(".local") || !host.includes(".")) return false;
  return true;
}

export function getZettleWebhookDestinationUrl(): string | null {
  const origin = canonicalSiteOrigin().replace(/\/$/, "");
  if (!origin) return null;
  return `${origin}/api/webhooks/zettle`;
}

/**
 * Kontakt-E-Mail für Pusher-Subscription.
 * Reihenfolge: Env ZETTLE_WEBHOOK_CONTACT_EMAIL → Shop contact/support → ADMIN_SEED_EMAIL.
 */
export async function resolveZettleWebhookContactEmail(): Promise<string | null> {
  const fromEnv = process.env.ZETTLE_WEBHOOK_CONTACT_EMAIL?.trim();
  if (isValidContactEmail(fromEnv)) return fromEnv;

  try {
    const shop = await getShopSettings();
    if (isValidContactEmail(shop.contactEmail)) return shop.contactEmail!.trim();
    if (isValidContactEmail(shop.supportEmail)) return shop.supportEmail!.trim();
  } catch {
    /* ShopSettings optional */
  }

  const seed = process.env.ADMIN_SEED_EMAIL?.trim();
  if (isValidContactEmail(seed)) return seed;

  return null;
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

  const contactEmail = await resolveZettleWebhookContactEmail();
  if (!contactEmail) {
    return {
      ok: false,
      destination,
      message:
        "Gültige Kontakt-E-Mail für den Zettle-Webhook fehlt. Bitte ZETTLE_WEBHOOK_CONTACT_EMAIL setzen (echte Adresse, z. B. ops@deinedomain.de) oder Kontakt-E-Mail unter Einstellungen → Shop pflegen — dann „Webhook einrichten“ erneut.",
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
      contactEmail,
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
    return {
      ok: true,
      destination,
      message: `PurchaseCreated-Webhook eingerichtet (Kontakt: ${contactEmail}).`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook-Einrichtung fehlgeschlagen.";
    const detail =
      e && typeof e === "object" && "responseBody" in e
        ? String((e as { responseBody?: string }).responseBody ?? "").slice(0, 200)
        : "";
    const emailHint =
      detail.includes("validEmailAddress") || detail.includes("CONSTRAINT_VIOLATION")
        ? ` Kontakt-E-Mail „${contactEmail}“ wurde von Zettle abgelehnt — bitte ZETTLE_WEBHOOK_CONTACT_EMAIL auf eine echte Adresse setzen.`
        : "";
    return {
      ok: false,
      destination,
      message: `${detail ? `${msg} ${detail}` : msg}${emailHint}`,
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
