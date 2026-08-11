import {
  createNotConfiguredShippingLabelAdapter,
  type ShippingLabelPort,
} from "@/features/fulfillment/application/shipping-label-port";
import { createInternetmarkeShippingLabelAdapter } from "@/features/fulfillment/infrastructure/internetmarke-shipping-label-adapter";

/**
 * Wählt den Label-Adapter anhand der Env-Credentials.
 * Ohne INTERNETMARKE-* → NotConfigured (manueller Versand bleibt möglich).
 */
export function createShippingLabelPortFromEnv(): ShippingLabelPort {
  return createInternetmarkeShippingLabelAdapter() ?? createNotConfiguredShippingLabelAdapter();
}
