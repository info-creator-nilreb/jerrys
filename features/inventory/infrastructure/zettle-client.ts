import "server-only";

import {
  getZettleAttributionClientId,
  ZETTLE_INVENTORY_API_BASE_URL,
  ZETTLE_OAUTH_BASE_URL,
  ZETTLE_PRODUCT_API_BASE_URL,
  ZETTLE_PURCHASE_API_BASE_URL,
  ZETTLE_PUSHER_API_BASE_URL,
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

export type ZettleInventoryVariantBalance = {
  variantUuid: string;
  productUuid: string;
  balance: number;
  locationUuid: string | null;
};

export type ZettleInventoryLocation = {
  inventoryUuid: string;
  inventoryType: string;
  name: string | null;
  defaultInventory: boolean;
};

export type ZettleInventoryChange = {
  productUuid: string;
  variantUuid: string;
  fromLocationUuid: string;
  toLocationUuid: string;
  change: number;
};

export type ZettlePusherSubscription = {
  uuid: string;
  destination: string;
  eventNames: string[];
  status?: string;
  signingKey?: string;
};

export class ZettleClient {
  constructor(private readonly getAccessToken: () => Promise<string>) {}

  private async headers(json = false): Promise<HeadersInit> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (json) headers["Content-Type"] = "application/json";
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

  async getPurchase(purchaseUuid: string): Promise<ZettlePurchase> {
    const res = await fetch(
      `${ZETTLE_PURCHASE_API_BASE_URL}/purchase/v2/${encodeURIComponent(purchaseUuid)}`,
      { headers: await this.headers() },
    );
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Kauf laden fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
    return JSON.parse(text) as ZettlePurchase;
  }

  /** Inventar-Locations (STORE/SOLD/SUPPLIER/BIN). Scope READ:PRODUCT. */
  async listInventories(): Promise<ZettleInventoryLocation[]> {
    const res = await fetch(`${ZETTLE_INVENTORY_API_BASE_URL}/inventories`, {
      headers: await this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Inventories laden fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
    const json = JSON.parse(text) as unknown;
    const list = Array.isArray(json) ? json : [];
    return list
      .map((raw) => {
        const row = raw as {
          inventoryUuid?: string;
          uuid?: string;
          inventoryType?: string;
          type?: string;
          name?: string;
          defaultInventory?: boolean;
        };
        const inventoryUuid = row.inventoryUuid || row.uuid;
        const inventoryType = row.inventoryType || row.type;
        if (!inventoryUuid || !inventoryType) return null;
        return {
          inventoryUuid,
          inventoryType,
          name: row.name ?? null,
          defaultInventory: Boolean(row.defaultInventory),
        } satisfies ZettleInventoryLocation;
      })
      .filter((x): x is ZettleInventoryLocation => x != null);
  }

  /**
   * Bestand verschieben (z. B. STORE→SOLD bei Online-Verkauf).
   * Scope WRITE:PRODUCT. Response oft 200 mit Balances oder 204.
   */
  async moveInventoryBalances(input: {
    changes: ZettleInventoryChange[];
    externalUuid?: string;
  }): Promise<void> {
    if (input.changes.length === 0) return;
    const body: Record<string, unknown> = {
      changes: input.changes.map((c) => ({
        productUuid: c.productUuid,
        variantUuid: c.variantUuid,
        fromLocationUuid: c.fromLocationUuid,
        toLocationUuid: c.toLocationUuid,
        change: c.change,
      })),
    };
    if (input.externalUuid) body.externalUuid = input.externalUuid;

    const res = await fetch(`${ZETTLE_INVENTORY_API_BASE_URL}/organizations/self/inventory`, {
      method: "PUT",
      headers: await this.headers(true),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Inventory-Update fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 400),
      });
    }
  }

  /** STORE-Inventory-Balances (Discrepancy). Scope WRITE:PRODUCT empfohlen. */
  async listStoreInventoryBalances(): Promise<ZettleInventoryVariantBalance[]> {
    const res = await fetch(`${ZETTLE_INVENTORY_API_BASE_URL}/organizations/self/inventory`, {
      headers: await this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      const res2 = await fetch(`${ZETTLE_INVENTORY_API_BASE_URL}/inventory`, {
        headers: await this.headers(),
      });
      const text2 = await res2.text();
      if (!res2.ok) {
        throw Object.assign(new Error(`Zettle Inventory laden fehlgeschlagen (${res.status}).`), {
          responseBody: text.slice(0, 300),
        });
      }
      return parseInventoryBalances(text2);
    }
    return parseInventoryBalances(text);
  }

  async listPusherSubscriptions(): Promise<ZettlePusherSubscription[]> {
    const res = await fetch(`${ZETTLE_PUSHER_API_BASE_URL}/organizations/self/subscriptions`, {
      headers: await this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Subscriptions laden fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
    const json = JSON.parse(text) as unknown;
    const list = Array.isArray(json) ? json : [];
    return list.map((raw) => {
      const s = raw as ZettlePusherSubscription;
      return {
        uuid: s.uuid,
        destination: s.destination,
        eventNames: Array.isArray(s.eventNames) ? s.eventNames : [],
        status: s.status,
        signingKey: s.signingKey,
      };
    });
  }

  async createPusherSubscription(input: {
    uuid: string;
    destination: string;
    contactEmail: string;
    eventNames: string[];
  }): Promise<ZettlePusherSubscription> {
    const res = await fetch(`${ZETTLE_PUSHER_API_BASE_URL}/organizations/self/subscriptions`, {
      method: "POST",
      headers: await this.headers(true),
      body: JSON.stringify({
        uuid: input.uuid,
        transportName: "WEBHOOK",
        eventNames: input.eventNames,
        destination: input.destination,
        contactEmail: input.contactEmail,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw Object.assign(new Error(`Zettle Webhook anlegen fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 400),
      });
    }
    return JSON.parse(text) as ZettlePusherSubscription;
  }

  async deletePusherSubscription(subscriptionUuid: string): Promise<void> {
    const res = await fetch(
      `${ZETTLE_PUSHER_API_BASE_URL}/organizations/self/subscriptions/${encodeURIComponent(subscriptionUuid)}`,
      { method: "DELETE", headers: await this.headers() },
    );
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw Object.assign(new Error(`Zettle Webhook löschen fehlgeschlagen (${res.status}).`), {
        responseBody: text.slice(0, 300),
      });
    }
  }
}

function parseInventoryBalances(text: string): ZettleInventoryVariantBalance[] {
  const json = JSON.parse(text) as {
    variants?: Array<{
      variantUuid?: string;
      productUuid?: string;
      balance?: string | number;
      locationUuid?: string;
    }>;
  };
  const variants = Array.isArray(json.variants) ? json.variants : [];
  return variants
    .filter((v): v is {
      variantUuid: string;
      productUuid: string;
      balance: string | number;
      locationUuid?: string;
    } => Boolean(v.variantUuid && v.productUuid))
    .map((v) => ({
      variantUuid: v.variantUuid,
      productUuid: v.productUuid,
      balance: Number.parseFloat(String(v.balance ?? "0")) || 0,
      locationUuid: v.locationUuid ?? null,
    }));
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
