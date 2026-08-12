import "server-only";

import {
  getZettleAttributionClientId,
  ZETTLE_OAUTH_BASE_URL,
  ZETTLE_PRODUCT_API_BASE_URL,
  ZETTLE_PURCHASE_API_BASE_URL,
} from "@/features/inventory/infrastructure/zettle-config";
import {
  exchangeZettleApiKeyForToken,
  getZettleConnectionSecrets,
  updateZettleCachedAccessToken,
} from "@/features/inventory/infrastructure/zettle-connection";

export type ZettleUserInfo = {
  uuid: string;
  organizationUuid: string;
};

export type ZettleCatalogVariant = {
  uuid: string;
  name: string | null;
  sku: string | null;
};

export type ZettleCatalogProduct = {
  uuid: string;
  name: string;
  variants: ZettleCatalogVariant[];
};

export type ZettlePurchaseProductLine = {
  type?: string;
  name?: string;
  quantity: string;
  productUuid?: string;
  variantUuid?: string;
};

export type ZettlePurchase = {
  purchaseUUID1?: string;
  purchaseUUID?: string;
  purchaseNumber?: number;
  timestamp?: string;
  created?: string;
  refund?: boolean;
  products?: ZettlePurchaseProductLine[];
};

export class ZettleClient {
  constructor(private readonly getAccessToken: () => Promise<string>) {}

  private async headers(): Promise<HeadersInit> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const appId = getZettleAttributionClientId();
    if (appId) {
      headers["X-iZettle-Application-Id"] = appId;
    }
    return headers;
  }

  async getUserSelf(): Promise<ZettleUserInfo> {
    const res = await fetch(`${ZETTLE_OAUTH_BASE_URL}/users/self`, {
      headers: await this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle users/self fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
    const json = JSON.parse(text) as { uuid?: string; organizationUuid?: string };
    if (!json.uuid || !json.organizationUuid) {
      throw new Error("Zettle users/self ohne uuid/organizationUuid.");
    }
    return { uuid: json.uuid, organizationUuid: json.organizationUuid };
  }

  async listProducts(): Promise<ZettleCatalogProduct[]> {
    const res = await fetch(`${ZETTLE_PRODUCT_API_BASE_URL}/organizations/self/products/v2`, {
      headers: await this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Produkte laden fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
    const json = JSON.parse(text) as unknown;
    const list = Array.isArray(json)
      ? json
      : Array.isArray((json as { products?: unknown }).products)
        ? (json as { products: unknown[] }).products
        : [];

    return list
      .map((raw) => {
        const p = raw as {
          uuid?: string;
          name?: string;
          variants?: Array<{ uuid?: string; name?: string; sku?: string }>;
        };
        if (!p.uuid || !p.name) return null;
        const variants = (p.variants ?? [])
          .filter((v): v is { uuid: string; name?: string; sku?: string } => Boolean(v.uuid))
          .map((v) => ({
            uuid: v.uuid,
            name: v.name ?? null,
            sku: v.sku ?? null,
          }));
        return { uuid: p.uuid, name: p.name, variants } satisfies ZettleCatalogProduct;
      })
      .filter((p): p is ZettleCatalogProduct => p != null);
  }

  async listPurchases(params: {
    startDate?: string;
    limit?: number;
    descending?: boolean;
    lastPurchaseHash?: string;
  }): Promise<{ purchases: ZettlePurchase[]; lastPurchaseHash: string | null }> {
    const qs = new URLSearchParams();
    qs.set("limit", String(params.limit ?? 50));
    qs.set("descending", params.descending === false ? "false" : "true");
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.lastPurchaseHash) qs.set("lastPurchaseHash", params.lastPurchaseHash);

    const res = await fetch(`${ZETTLE_PURCHASE_API_BASE_URL}/purchases/v2?${qs}`, {
      headers: await this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Käufe laden fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
    const json = JSON.parse(text) as {
      purchases?: ZettlePurchase[];
      lastPurchaseHash?: string;
    };
    return {
      purchases: Array.isArray(json.purchases) ? json.purchases : [],
      lastPurchaseHash: json.lastPurchaseHash ?? null,
    };
  }
}

/**
 * Client mit Token-Refresh aus gespeichertem API-Key.
 * Access-Token wird gecacht und vor Ablauf (~2 min Puffer) erneuert.
 */
export async function createZettleClientFromConnection(): Promise<ZettleClient | null> {
  const secrets = await getZettleConnectionSecrets();
  if (!secrets) return null;

  const getAccessToken = async (): Promise<string> => {
    const now = Date.now();
    const expiresAt = secrets.accessTokenExpiresAt?.getTime() ?? 0;
    if (secrets.accessToken && expiresAt > now + 120_000) {
      return secrets.accessToken;
    }
    const token = await exchangeZettleApiKeyForToken({
      clientId: secrets.clientId,
      apiKey: secrets.apiKey,
    });
    const accessTokenExpiresAt = new Date(Date.now() + token.expiresIn * 1000);
    await updateZettleCachedAccessToken({
      accessToken: token.accessToken,
      accessTokenExpiresAt,
    });
    secrets.accessToken = token.accessToken;
    secrets.accessTokenExpiresAt = accessTokenExpiresAt;
    return token.accessToken;
  };

  return new ZettleClient(getAccessToken);
}
