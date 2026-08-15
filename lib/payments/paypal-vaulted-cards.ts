import { getPayPalAccessToken } from "@/lib/payments/paypal-access-token";
import { isPayPalConfigured, paypalApiBaseUrl } from "@/lib/payments/paypal-config";

export type PayPalVaultedCard = {
  id: string;
  brand: string;
  lastDigits: string;
  expiry?: string;
};

export function formatPayPalCardBrand(brand: string): string {
  const b = brand.trim().toUpperCase().replace(/[_-\s]/g, "");
  if (b === "VISA") return "Visa";
  if (b === "MASTERCARD" || b === "MASTER") return "Mastercard";
  if (b === "AMEX" || b === "AMERICANEXPRESS") return "American Express";
  if (b === "DISCOVER") return "Discover";
  if (b === "MAESTRO") return "Maestro";
  return brand.trim() || "Karte";
}

/** PayPal liefert `YYYY-MM`. */
export function formatPayPalCardExpiry(expiry: string | undefined): string | null {
  if (!expiry) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(expiry.trim());
  if (!m) return expiry.trim();
  return `${m[2]}/${m[1].slice(2)}`;
}

export function formatPayPalVaultedCardLabel(card: PayPalVaultedCard): string {
  const brand = formatPayPalCardBrand(card.brand);
  const digits = `•••• ${card.lastDigits}`;
  const exp = formatPayPalCardExpiry(card.expiry);
  return exp ? `${brand} ${digits} (gültig bis ${exp})` : `${brand} ${digits}`;
}

export async function listPayPalVaultedCards(customerId: string): Promise<PayPalVaultedCard[]> {
  if (!isPayPalConfigured()) return [];
  const id = customerId.trim();
  if (!id) return [];

  const token = await getPayPalAccessToken();
  const url = new URL(`${paypalApiBaseUrl()}/v3/vault/payment-tokens`);
  url.searchParams.set("customer_id", id);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    payment_tokens?: Array<{
      id?: string;
      payment_source?: {
        card?: { brand?: string; last_digits?: string; expiry?: string };
      };
    }>;
  };

  const out: PayPalVaultedCard[] = [];
  for (const t of json.payment_tokens ?? []) {
    const card = t.payment_source?.card;
    if (!t.id?.trim() || !card?.last_digits?.trim()) continue;
    out.push({
      id: t.id.trim(),
      brand: card.brand?.trim() || "Karte",
      lastDigits: card.last_digits.trim(),
      expiry: card.expiry?.trim() || undefined,
    });
  }
  return out;
}
