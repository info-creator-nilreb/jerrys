/**
 * Dünner HTTP-Client für INTERNETMARKE REST v1 (kein SOAP).
 * Spezifikation: https://developer.dhl.com/api-reference/deutsche-post-internetmarke-post-parcel-germany
 */

import { explainInternetmarkeAuthFailure } from "@/features/fulfillment/infrastructure/internetmarke-auth-error";
import { explainInternetmarkeCheckoutFailure, explainInternetmarkeRetoureFailure } from "@/features/fulfillment/infrastructure/internetmarke-provider-error";
import {
  INTERNETMARKE_API_BASE_URL,
  type InternetmarkeEnvConfig,
} from "@/features/fulfillment/infrastructure/internetmarke-config";

export type InternetmarkeFetch = typeof fetch;

export type InternetmarkeAddressPayload = {
  name: string;
  additionalName?: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
};

export type InternetmarkeCheckoutPdfInput = {
  shopOrderId: string;
  totalCents: number;
  pageFormatId: number;
  productCode: number;
  voucherLayout: "ADDRESS_ZONE" | "FRANKING_ZONE";
  sender: InternetmarkeAddressPayload;
  receiver: InternetmarkeAddressPayload;
};

export type InternetmarkeCheckoutPdfResult = {
  shopOrderId: string;
  link: string | null;
  trackingNumber: string | null;
  voucherId: string | null;
};

export type InternetmarkeRetoureResult = {
  shopRetoureId: string | null;
};

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

export class InternetmarkeClient {
  private tokenCache: TokenCache | null = null;

  constructor(
    private readonly config: InternetmarkeEnvConfig,
    private readonly fetchImpl: InternetmarkeFetch = fetch,
    private readonly baseUrl: string = INTERNETMARKE_API_BASE_URL,
  ) {}

  /** Gateway-Header `dhl-api-key` (API Key) — analog Products API. */
  private commonHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Accept: "application/json",
      "dhl-api-key": this.config.clientId.trim(),
      ...extra,
    };
  }

  /** Health check — GET / (ohne Bearer; API Key am Gateway). */
  async healthCheck(): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/`, {
      method: "GET",
      headers: this.commonHeaders(),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
    }
    return { ok: true };
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && now < this.tokenCache.expiresAtMs - 60_000) {
      return this.tokenCache.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId.trim(),
      client_secret: this.config.clientSecret.trim(),
      username: this.config.username.trim(),
      password: this.config.password,
    });

    const res = await this.fetchImpl(`${this.baseUrl}/user`, {
      method: "POST",
      headers: this.commonHeaders({
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      }),
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternetmarkeHttpError(
        "authorize",
        res.status,
        text,
        explainInternetmarkeAuthFailure(res.status, text),
      );
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token || typeof data.expires_in !== "number") {
      throw new InternetmarkeHttpError(
        "authorize",
        res.status,
        JSON.stringify(data).slice(0, 200),
        "INTERNETMARKE Auth: unerwartete Antwort (access_token/expires_in).",
      );
    }

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAtMs: now + data.expires_in * 1000,
    };
    return data.access_token;
  }

  /**
   * Kauft Marken als PDF (directCheckout=true — Parameter heißt nicht „finalize“).
   */
  async checkoutPdf(input: InternetmarkeCheckoutPdfInput): Promise<InternetmarkeCheckoutPdfResult> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/app/shoppingcart/pdf?directCheckout=true`;

    const payload = {
      type: "AppShoppingCartPDFRequest",
      shopOrderId: input.shopOrderId,
      total: input.totalCents,
      pageFormatId: input.pageFormatId,
      createManifest: false,
      createShippingList: "0",
      positions: [
        {
          productCode: input.productCode,
          voucherLayout: input.voucherLayout,
          positionType: "AppShoppingCartPDFPosition",
          position: { labelX: 1, labelY: 1, page: 1 },
          address: {
            sender: input.sender,
            receiver: input.receiver,
          },
        },
      ],
    };

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: this.commonHeaders({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternetmarkeHttpError(
        "checkout_pdf",
        res.status,
        text,
        explainInternetmarkeCheckoutFailure(res.status, text),
      );
    }

    const data = (await res.json()) as {
      link?: string;
      shoppingCart?: {
        shopOrderId?: string;
        voucherList?: Array<{ voucherId?: string; trackId?: string }>;
      };
    };

    const vouchers = data.shoppingCart?.voucherList ?? [];
    const first = vouchers[0];
    return {
      shopOrderId: data.shoppingCart?.shopOrderId ?? input.shopOrderId,
      link: typeof data.link === "string" ? data.link : null,
      trackingNumber: first?.trackId?.trim() || null,
      voucherId: first?.voucherId?.trim() || null,
    };
  }

  /** Retoure / Void unbenutzter Marken über shopOrderId. */
  async retoureByShopOrderId(shopOrderId: string): Promise<InternetmarkeRetoureResult> {
    const token = await this.getAccessToken();
    const res = await this.fetchImpl(`${this.baseUrl}/app/retoure`, {
      method: "POST",
      headers: this.commonHeaders({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        shoppingCart: { shopOrderId },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternetmarkeHttpError(
        "retoure",
        res.status,
        text,
        explainInternetmarkeRetoureFailure(res.status, text),
      );
    }

    const data = (await res.json()) as {
      shopRetoureId?: string;
      shop_retoure_id?: string;
    };
    return {
      shopRetoureId: data.shopRetoureId ?? data.shop_retoure_id ?? null,
    };
  }
}

export class InternetmarkeHttpError extends Error {
  constructor(
    readonly operation: "authorize" | "checkout_pdf" | "retoure" | "health",
    readonly status: number,
    readonly responseBody: string,
    message: string,
  ) {
    super(message);
    this.name = "InternetmarkeHttpError";
  }
}
