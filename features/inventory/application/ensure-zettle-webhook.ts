import "server-only";

import { createZettleClientFromConnection } from "@/features/inventory/infrastructure/zettle-client";
import type { ZettlePusherSubscription } from "@/features/inventory/infrastructure/zettle-client";
import {
  clearZettleConnectionError,
  clearZettleWebhookSubscription,
  getZettleConnectionSecrets,
  markZettleConnectionError,
  saveZettleWebhookSubscription,
} from "@/features/inventory/infrastructure/zettle-connection";
import { generateUuidV1 } from "@/features/inventory/infrastructure/zettle-uuid-v1";
import { getShopSettings } from "@/lib/shop/shop-settings";

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

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Öffentliche Webhook-Destination.
 * Bevorzugt NEXT_PUBLIC_SITE_URL (Production), dann AUTH_URL, dann VERCEL_URL.
 */
export function getZettleWebhookDestinationUrl(): string | null {
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fromAuth = process.env.AUTH_URL?.trim();
  const fromVercel = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//, "");
  const origin = normalizeOrigin(fromSite || fromAuth || (fromVercel ? `https://${fromVercel}` : ""));
  if (!origin) return null;
  if (
    origin.startsWith("http://127.") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("https://127.") ||
    origin.startsWith("https://localhost")
  ) {
    return null;
  }
  return `${origin.replace(/\/$/, "")}/api/webhooks/zettle`;
}

function looksLikeVercelPreviewHost(destination: string): boolean {
  try {
    const host = new URL(destination).hostname.toLowerCase();
    return host.includes("-git-") && host.endsWith(".vercel.app");
  } catch {
    return false;
  }
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

function matchesPurchaseDestination(
  s: ZettlePusherSubscription,
  destination: string,
): boolean {
  if (s.destination !== destination) return false;
  if (!Array.isArray(s.eventNames) || s.eventNames.length === 0) return true;
  return s.eventNames.includes("PurchaseCreated");
}

async function fail(
  destination: string | null,
  message: string,
): Promise<{ ok: false; destination: string | null; message: string }> {
  await markZettleConnectionError(message);
  return { ok: false, destination, message };
}

async function succeed(
  destination: string,
  message: string,
): Promise<{ ok: true; destination: string; message: string }> {
  await clearZettleConnectionError();
  return { ok: true, destination, message };
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
  if (!destination) {
    return fail(
      null,
      "Öffentliche HTTPS-URL fehlt (NEXT_PUBLIC_SITE_URL). Webhook wird mit Production-URL eingerichtet — dann „Webhook einrichten“.",
    );
  }

  if (looksLikeVercelPreviewHost(destination)) {
    return fail(
      destination,
      `Webhook-Ziel sieht wie Vercel-Preview aus (${destination}). Bitte NEXT_PUBLIC_SITE_URL auf die Production-Domain setzen und erneut „Webhook einrichten“.`,
    );
  }

  const contactEmail = await resolveZettleWebhookContactEmail();
  if (!contactEmail) {
    return fail(
      destination,
      "Gültige Kontakt-E-Mail für den Zettle-Webhook fehlt. Bitte ZETTLE_WEBHOOK_CONTACT_EMAIL setzen (echte Adresse, z. B. ops@deinedomain.de) oder Kontakt-E-Mail unter Einstellungen → Shop pflegen — dann „Webhook einrichten“ erneut.",
    );
  }

  const client = await createZettleClientFromConnection();
  const secrets = await getZettleConnectionSecrets();
  if (!client || !secrets) {
    return fail(destination, "Zettle nicht verbunden.");
  }

  if (
    secrets.webhookSubscriptionUuid &&
    secrets.webhookSigningKey &&
    secrets.webhookDestination === destination
  ) {
    return succeed(destination, "Webhook bereits aktiv.");
  }

  try {
    const existing = await client.listPusherSubscriptions();
    const match = existing.find((s) => matchesPurchaseDestination(s, destination));

    if (match?.signingKey) {
      await saveZettleWebhookSubscription({
        subscriptionUuid: match.uuid,
        signingKey: match.signingKey,
        destination,
      });
      return succeed(destination, "Bestehende Subscription übernommen.");
    }

    // Orphan ohne Signing-Key oder veraltete lokale UUID: Destination freiräumen und neu anlegen
    const toDelete = new Set<string>();
    if (secrets.webhookSubscriptionUuid) toDelete.add(secrets.webhookSubscriptionUuid);
    for (const s of existing) {
      if (matchesPurchaseDestination(s, destination)) toDelete.add(s.uuid);
    }
    for (const uuid of toDelete) {
      try {
        await client.deletePusherSubscription(uuid);
      } catch {
        /* ignore */
      }
    }
    if (toDelete.size > 0) {
      await clearZettleWebhookSubscription();
    }

    const created = await client.createPusherSubscription({
      uuid: generateUuidV1(),
      destination,
      contactEmail,
      eventNames: [...PURCHASE_EVENTS],
    });
    if (!created.signingKey) {
      return fail(
        destination,
        "Subscription angelegt, aber ohne signingKey — bitte „Webhook einrichten“ erneut.",
      );
    }
    await saveZettleWebhookSubscription({
      subscriptionUuid: created.uuid,
      signingKey: created.signingKey,
      destination,
    });
    return succeed(
      destination,
      `PurchaseCreated-Webhook eingerichtet (Kontakt: ${contactEmail}).`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook-Einrichtung fehlgeschlagen.";
    const detail =
      e && typeof e === "object" && "responseBody" in e
        ? String((e as { responseBody?: string }).responseBody ?? "").slice(0, 280)
        : "";
    const combined = `${detail ? `${msg} ${detail}` : msg}`;
    let hint = "";
    if (detail.includes("validEmailAddress") || detail.includes("CONSTRAINT_VIOLATION")) {
      hint = ` Kontakt-E-Mail „${contactEmail}“ wurde von Zettle abgelehnt — bitte ZETTLE_WEBHOOK_CONTACT_EMAIL auf eine echte Adresse setzen.`;
    } else if (
      detail.includes("DESTINATION") ||
      detail.includes("not accessible") ||
      detail.includes("NOT_ACCESSIBLE") ||
      msg.includes("(400)") ||
      msg.includes("(424)")
    ) {
      hint = ` Zettle muss ${destination} per HTTPS erreichen können (kein Deployment Protection / Login vor der Route). TestMessage muss mit 2xx antworten.`;
    }
    return fail(destination, `${combined}${hint}`);
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
