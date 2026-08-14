import { orderAdminDeleteBlocker } from "@/features/orders";

export type CustomerOrderDeleteSnapshot = {
  id: string;
  orderNumber: string;
  idempotencyKey: string | null;
  invoiceNumber: string | null;
  payments: { status: string }[];
};

export type CustomerAccountDeleteSnapshot = {
  exists: boolean;
  active: boolean;
};

/** Prüft, ob ein Admin-Kunde (E-Mail-Gruppe) gelöscht werden darf. */
export function customerAdminDeleteBlocker(
  account: CustomerAccountDeleteSnapshot,
  orders: CustomerOrderDeleteSnapshot[],
): string | null {
  if (account.exists && account.active) {
    return "Aktives Kundenkonto — nicht löschbar. Import-Bestellungen einzeln unter Bestellungen prüfen.";
  }
  if (orders.length === 0) {
    return "Keine Bestellungen vorhanden.";
  }
  for (const order of orders) {
    const blocker = orderAdminDeleteBlocker(order);
    if (blocker) {
      return `${order.orderNumber}: ${blocker}`;
    }
  }
  return null;
}

export function customerIsDeletable(
  account: CustomerAccountDeleteSnapshot,
  orders: CustomerOrderDeleteSnapshot[],
): boolean {
  return customerAdminDeleteBlocker(account, orders) == null;
}
