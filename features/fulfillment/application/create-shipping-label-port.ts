import {
  createNotConfiguredShippingLabelAdapter,
  type ShippingLabelPort,
} from "@/features/fulfillment/application/shipping-label-port";
import { resolveInternetmarkeConfig } from "@/features/fulfillment/infrastructure/internetmarke-config";
import { createInternetmarkeShippingLabelAdapter } from "@/features/fulfillment/infrastructure/internetmarke-shipping-label-adapter";

/**
 * Wählt den Label-Adapter anhand DB-Credentials (Admin) oder Env-Fallback.
 * Ohne Konfiguration → NotConfigured (manueller Versand bleibt möglich).
 */
export async function createShippingLabelPort(): Promise<ShippingLabelPort> {
  const config = await resolveInternetmarkeConfig();
  if (!config) return createNotConfiguredShippingLabelAdapter();
  return (
    createInternetmarkeShippingLabelAdapter({ config }) ??
    createNotConfiguredShippingLabelAdapter()
  );
}

/** @deprecated Alias — nutze `createShippingLabelPort`. */
export async function createShippingLabelPortFromEnv(): Promise<ShippingLabelPort> {
  return createShippingLabelPort();
}
