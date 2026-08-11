import type {
  PurchaseShippingLabelInput,
  PurchaseShippingLabelResult,
  ShippingLabelAddress,
  ShippingLabelPort,
  VoidShippingLabelInput,
  VoidShippingLabelResult,
} from "@/features/fulfillment/application/shipping-label-port";
import {
  InternetmarkeClient,
  InternetmarkeHttpError,
  type InternetmarkeFetch,
} from "@/features/fulfillment/infrastructure/internetmarke-client";
import {
  getInternetmarkeConfigFromEnv,
  type InternetmarkeEnvConfig,
} from "@/features/fulfillment/infrastructure/internetmarke-config";
import { toInternetmarkeCountryCode } from "@/features/fulfillment/infrastructure/internetmarke-country";

function sanitizeShopOrderId(raw: string): string {
  return raw.replace(/[<&]/g, "").trim().slice(0, 80);
}

function toApiAddress(
  addr: ShippingLabelAddress,
):
  | { ok: true; value: Parameters<InternetmarkeClient["checkoutPdf"]>[0]["sender"] }
  | { ok: false; message: string } {
  const name = addr.name.trim();
  const addressLine1 = addr.addressLine1.trim();
  const postalCode = addr.postalCode.trim();
  const city = addr.city.trim();
  const country = toInternetmarkeCountryCode(addr.country);
  if (!name || !addressLine1 || !postalCode || !city) {
    return {
      ok: false,
      message: "Absender-/Empfängeradresse unvollständig (Name, Straße, PLZ, Ort).",
    };
  }
  if (!country) {
    return {
      ok: false,
      message: `Land nicht unterstützbar für INTERNETMARKE (erwartet ISO2/ISO3): ${addr.country}`,
    };
  }
  const additional = addr.additionalName?.trim();
  const line2 = addr.addressLine2?.trim();
  return {
    ok: true,
    value: {
      name,
      ...(additional ? { additionalName: additional } : {}),
      addressLine1,
      ...(line2 ? { addressLine2: line2 } : {}),
      postalCode,
      city,
      country,
    },
  };
}

export function createInternetmarkeShippingLabelAdapter(options?: {
  config?: InternetmarkeEnvConfig;
  fetchImpl?: InternetmarkeFetch;
  client?: InternetmarkeClient;
}): ShippingLabelPort | null {
  const config = options?.config ?? getInternetmarkeConfigFromEnv();
  if (!config && !options?.client) return null;

  const client =
    options?.client ??
    new InternetmarkeClient(config!, options?.fetchImpl ?? fetch);

  const defaults = config ?? getInternetmarkeConfigFromEnv();

  return {
    async purchaseLabel(input: PurchaseShippingLabelInput): Promise<PurchaseShippingLabelResult> {
      if (input.provider !== "internetmarke") {
        return {
          ok: false,
          error: "not_implemented",
          message: `Provider ${input.provider} wird von diesem Adapter nicht bedient.`,
        };
      }

      const productCode = input.productCode ?? defaults?.productCode;
      const totalCents = input.totalCents ?? defaults?.productPriceCents;
      const pageFormatId = input.pageFormatId ?? defaults?.pageFormatId ?? 1;
      const voucherLayout = input.voucherLayout ?? defaults?.voucherLayout ?? "ADDRESS_ZONE";

      if (productCode == null || totalCents == null) {
        return {
          ok: false,
          error: "invalid_request",
          message:
            "INTERNETMARKE Produktcode und Preis (Cent) fehlen (Env INTERNETMARKE_PRODUCT_* oder Input).",
        };
      }

      const sender = toApiAddress(input.sender);
      if (!sender.ok) {
        return { ok: false, error: "invalid_request", message: sender.message };
      }
      const receiver = toApiAddress(input.receiver);
      if (!receiver.ok) {
        return { ok: false, error: "invalid_request", message: receiver.message };
      }

      const shopOrderId = sanitizeShopOrderId(input.shopOrderId ?? input.idempotencyKey);
      if (!shopOrderId) {
        return {
          ok: false,
          error: "invalid_request",
          message: "shopOrderId / idempotencyKey leer nach Sanitisierung.",
        };
      }

      try {
        const result = await client.checkoutPdf({
          shopOrderId,
          totalCents,
          pageFormatId,
          productCode,
          voucherLayout,
          sender: sender.value,
          receiver: receiver.value,
        });
        return {
          ok: true,
          externalRef: result.shopOrderId,
          trackingNumber: result.trackingNumber,
          // Privater Blob folgt später; temporärer Link nur als Hinweis.
          labelStorageKey: null,
          labelDownloadUrl: result.link,
        };
      } catch (e) {
        if (e instanceof InternetmarkeHttpError) {
          return {
            ok: false,
            error: e.status >= 400 && e.status < 500 ? "provider_rejected" : "provider_rejected",
            message: `${e.message} ${e.responseBody.slice(0, 180)}`.trim(),
          };
        }
        throw e;
      }
    },

    async voidLabel(input: VoidShippingLabelInput): Promise<VoidShippingLabelResult> {
      if (input.provider !== "internetmarke") {
        return {
          ok: false,
          error: "not_implemented",
          message: `Provider ${input.provider} wird von diesem Adapter nicht bedient.`,
        };
      }
      const shopOrderId = sanitizeShopOrderId(input.externalRef);
      if (!shopOrderId) {
        return {
          ok: false,
          error: "invalid_request",
          message: "externalRef (shopOrderId) fehlt.",
        };
      }
      try {
        const result = await client.retoureByShopOrderId(shopOrderId);
        return { ok: true, shopRetoureId: result.shopRetoureId };
      } catch (e) {
        if (e instanceof InternetmarkeHttpError) {
          return {
            ok: false,
            error: "provider_rejected",
            message: `${e.message} ${e.responseBody.slice(0, 180)}`.trim(),
          };
        }
        throw e;
      }
    },
  };
}
