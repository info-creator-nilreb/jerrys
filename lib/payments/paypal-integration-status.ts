import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";
import {
  isPayPalConfigured,
  isPayPalSepaDebitEnabled,
  paypalApiEnv,
  type PayPalApiEnv,
} from "@/lib/payments/paypal-config";

export type PayPalIntegrationStatus = {
  credentialsConfigured: boolean;
  webhookConfigured: boolean;
  /** Credentials + Webhook gesetzt — Checkout funktioniert auch ohne Webhook, Live braucht beides. */
  readyForLive: boolean;
  env: PayPalApiEnv;
  sepaEnabled: boolean;
  clientIdMasked: string | null;
  webhookIdMasked: string | null;
  webhookUrl: string | null;
  siteOrigin: string;
};

/** Maskierte PayPal-Client- oder Webhook-ID für Admin-Diagnose (kein Secret). */
export function maskPayPalId(id: string): string {
  const t = id.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export function getPayPalIntegrationStatus(): PayPalIntegrationStatus {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? "";
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() ?? "";
  const credentialsConfigured = isPayPalConfigured();
  const webhookConfigured = Boolean(webhookId);
  const siteOrigin = canonicalSiteOrigin();
  const env = paypalApiEnv();

  return {
    credentialsConfigured,
    webhookConfigured,
    readyForLive: credentialsConfigured && webhookConfigured && env === "live",
    env,
    sepaEnabled: isPayPalSepaDebitEnabled(),
    clientIdMasked: clientId ? maskPayPalId(clientId) : null,
    webhookIdMasked: webhookId ? maskPayPalId(webhookId) : null,
    webhookUrl: siteOrigin ? `${siteOrigin}/api/webhooks/paypal` : null,
    siteOrigin,
  };
}
