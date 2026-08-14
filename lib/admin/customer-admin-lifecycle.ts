import { deleteOrders, type OrderLifecycleResult } from "@/features/orders";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  customerAdminDeleteBlocker,
  type CustomerOrderDeleteSnapshot,
} from "@/lib/admin/customer-admin-delete-rules";
import { getCustomerDeleteContextForAdmin } from "@/lib/admin/customer-queries";

const log = createLogger("customers.admin-lifecycle");

export type CustomerLifecycleResult = {
  ok: boolean;
  affectedCustomerKeys: string[];
  deletedOrderIds: string[];
  skipped: { customerKey: string; reason: string }[];
  message?: string;
};

export { customerAdminDeleteBlocker, customerIsDeletable } from "@/lib/admin/customer-admin-delete-rules";
export type { CustomerOrderDeleteSnapshot };

function uniqueKeys(keys: string[]): string[] {
  return [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))];
}

export async function deleteCustomersByKeys(customerKeys: string[]): Promise<CustomerLifecycleResult> {
  const keys = uniqueKeys(customerKeys);
  if (keys.length === 0) {
    return {
      ok: false,
      affectedCustomerKeys: [],
      deletedOrderIds: [],
      skipped: [],
      message: "Keine Kunden ausgewählt.",
    };
  }

  try {
    const skipped: { customerKey: string; reason: string }[] = [];
    const orderIdsToDelete: string[] = [];
    const affectedKeys: string[] = [];

    for (const customerKey of keys) {
      const ctx = await getCustomerDeleteContextForAdmin(customerKey);
      if (!ctx) {
        skipped.push({ customerKey, reason: "Nicht gefunden." });
        continue;
      }
      const blocker = customerAdminDeleteBlocker(ctx.account, ctx.orders);
      if (blocker) {
        skipped.push({ customerKey, reason: blocker });
        continue;
      }
      orderIdsToDelete.push(...ctx.orders.map((o) => o.id));
      affectedKeys.push(customerKey);
    }

    let deleteResult: OrderLifecycleResult = {
      ok: true,
      affectedIds: [],
      skipped: [],
    };

    if (orderIdsToDelete.length > 0) {
      deleteResult = await deleteOrders(orderIdsToDelete);
    }

    const deletedOrderIds = deleteResult.affectedIds;
    const successKeys =
      affectedKeys.length > 0 && deletedOrderIds.length > 0 ? affectedKeys : [];

    return {
      ok: deletedOrderIds.length > 0 || (skipped.length === 0 && keys.length > 0),
      affectedCustomerKeys: successKeys,
      deletedOrderIds,
      skipped: [
        ...skipped,
        ...deleteResult.skipped.map((s) => ({
          customerKey: s.id,
          reason: s.reason,
        })),
      ],
      message:
        deletedOrderIds.length > 0
          ? `${successKeys.length} Kunde(n) entfernt (${deletedOrderIds.length} Import-Bestellung(en) gelöscht).`
          : skipped.length > 0
            ? "Kein Kunde gelöscht."
            : "Nichts zu löschen.",
    };
  } catch (e) {
    log.error("delete_customers_failed", errorMeta(e));
    return {
      ok: false,
      affectedCustomerKeys: [],
      deletedOrderIds: [],
      skipped: [],
      message: "Löschen fehlgeschlagen.",
    };
  }
}
