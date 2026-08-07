/**
 * Reserviert verfügbaren Shop-Bestand für bestehende `pending_payment`-Bestellungen ohne
 * `inventory.available_reserved`-Event (Legacy nach Einführung der Reservierung bei Bestellaufgabe).
 *
 *   npm run orders:backfill-pending-stock-reservation
 *   ORDER_ID=cuid… npm run orders:backfill-pending-stock-reservation
 */
import { getPrisma } from "@/lib/db/prisma";
import {
  orderHasAvailableStockReserved,
  reserveAvailableStockForOrder,
} from "@/lib/orders/order-available-stock";

async function main() {
  const prisma = getPrisma();
  const orderIdFilter = process.env.ORDER_ID?.trim();

  const orders = await prisma.order.findMany({
    where: {
      status: "pending_payment",
      ...(orderIdFilter ? { id: orderIdFilter } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  for (const order of orders) {
    if (await orderHasAvailableStockReserved(prisma, order.id)) {
      continue;
    }
    const lines = order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    try {
      await prisma.$transaction(async (tx) => {
        const r = await reserveAvailableStockForOrder(tx, order.id, lines);
        if (!r.ok) {
          throw new Error(r.error);
        }
      });
      updated += 1;
      console.log(`[ok] ${order.orderNumber}: Reservierung angelegt`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[skip] ${order.orderNumber}: ${msg}`);
    }
  }

  console.log(`Fertig: ${updated} Bestellung(en) mit Reservierung.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
