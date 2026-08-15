import { createLogger, errorMeta } from "@/lib/logging/logger";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { getPayPalUserIdToken } from "@/lib/payments/paypal-user-id-token";
import { paypalVaultCustomerId } from "@/lib/payments/paypal-vault-customer-id";
import {
  listPayPalVaultedCards,
  type PayPalVaultedCard,
} from "@/lib/payments/paypal-vaulted-cards";

const log = createLogger("checkout.paypal_vault");

export async function loadPayPalCustomerVault(shopCustomerId: string | null): Promise<{
  userIdToken: string | null;
  cards: PayPalVaultedCard[];
}> {
  if (!shopCustomerId || !isPayPalConfigured()) {
    return { userIdToken: null, cards: [] };
  }
  const vaultCustomerId = paypalVaultCustomerId(shopCustomerId);
  try {
    const [userIdToken, cards] = await Promise.all([
      getPayPalUserIdToken(vaultCustomerId),
      listPayPalVaultedCards(vaultCustomerId),
    ]);
    return { userIdToken, cards };
  } catch (e) {
    log.warn("paypal_vault_load_failed", errorMeta(e));
    return { userIdToken: null, cards: [] };
  }
}
