import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import { createOrderEvent } from "@/lib/orders/order-events";
import { getVerifiedActiveCustomerId } from "@/features/customers/application/get-verified-active-customer-id";
import { normalizeCustomerEmail } from "@/features/customers/domain/email";

const log = createLogger("customers.guest-order-claim");

/** Auditereignis für die Zuordnung einer Gastbestellung zu einem Konto. */
export const ORDER_EVENT_CUSTOMER_LINKED = "order.customer_linked" as const;

export type ClaimableGuestOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  totalGrossCents: number;
  currency: string;
  itemCount: number;
  /** Nachname der Lieferadresse — hilft beim Wiedererkennen der Bestellung. */
  shippingLastName: string;
  shippingCity: string;
};

async function verifiedCustomerWithEmail(
  customerId: string,
): Promise<{ id: string; email: string } | null> {
  const verified = await getVerifiedActiveCustomerId(customerId);
  if (!verified) return null;

  const customer = await getPrisma().customer.findUnique({
    where: { id: verified },
    select: { id: true, email: true },
  });
  if (!customer?.email) return null;
  return { id: customer.id, email: normalizeCustomerEmail(customer.email) };
}

/**
 * Gastbestellungen, die zur **verifizierten** E-Mail des Kontos gehören und noch keinem
 * Konto zugeordnet sind. Reine Vorschau — die Zuordnung passiert erst nach Bestätigung.
 *
 * Bestell-E-Mails werden im Checkout nicht normalisiert, daher Vergleich ohne Groß-/
 * Kleinschreibung. Eine E-Mail allein ist kein Identitätsnachweis; die Verifikation des
 * Kontos ist die Bedingung dafür, dass dieser Vergleich überhaupt zulässig ist.
 */
export async function listClaimableGuestOrders(
  customerId: string,
): Promise<ClaimableGuestOrder[]> {
  const customer = await verifiedCustomerWithEmail(customerId);
  if (!customer) return [];

  const rows = await getPrisma().order.findMany({
    where: {
      customerId: null,
      email: { equals: customer.email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      totalGrossCents: true,
      currency: true,
      shippingLastName: true,
      shippingCity: true,
      _count: { select: { items: true } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    totalGrossCents: o.totalGrossCents,
    currency: o.currency,
    itemCount: o._count.items,
    shippingLastName: o.shippingLastName,
    shippingCity: o.shippingCity,
  }));
}

export async function countClaimableGuestOrders(customerId: string): Promise<number> {
  const customer = await verifiedCustomerWithEmail(customerId);
  if (!customer) return 0;

  return getPrisma().order.count({
    where: {
      customerId: null,
      email: { equals: customer.email, mode: "insensitive" },
    },
  });
}

export type ClaimGuestOrdersResult =
  | { ok: true; claimedCount: number }
  | { ok: false; message: string };

/**
 * Ordnet die Gastbestellungen der verifizierten E-Mail dem Konto zu.
 *
 * Idempotent und rennsicher: Jede Bestellung wird nur übernommen, solange sie noch
 * `customerId = null` hat. Ein zweiter Aufruf ordnet nichts erneut zu.
 */
export async function claimGuestOrdersForCustomer(
  customerId: string,
): Promise<ClaimGuestOrdersResult> {
  const customer = await verifiedCustomerWithEmail(customerId);
  if (!customer) {
    return {
      ok: false,
      message: "Zuordnung nur mit bestätigter E-Mail-Adresse und aktivem Konto möglich.",
    };
  }

  const prisma = getPrisma();

  let candidates: { id: string; orderNumber: string }[];
  try {
    candidates = await prisma.order.findMany({
      where: {
        customerId: null,
        email: { equals: customer.email, mode: "insensitive" },
      },
      select: { id: true, orderNumber: true },
    });
  } catch (e) {
    log.error("guest_order_claim_lookup_failed", { customerId: customer.id, error: String(e) });
    return {
      ok: false,
      message: "Bestellungen konnten gerade nicht geprüft werden. Bitte später erneut versuchen.",
    };
  }

  if (!candidates.length) return { ok: true, claimedCount: 0 };

  let claimedCount = 0;
  for (const candidate of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        // `updateMany` mit `customerId: null` gewinnt genau einmal, auch bei parallelen Requests.
        const updated = await tx.order.updateMany({
          where: { id: candidate.id, customerId: null },
          data: { customerId: customer.id },
        });
        if (updated.count === 0) return;

        await createOrderEvent(tx, candidate.id, ORDER_EVENT_CUSTOMER_LINKED, {
          customerId: customer.id,
          matchedBy: "verified_email",
          orderNumber: candidate.orderNumber,
        });
        claimedCount += 1;
      });
    } catch (e) {
      log.error("guest_order_claim_failed", {
        customerId: customer.id,
        orderId: candidate.id,
        error: String(e),
      });
    }
  }

  log.info("guest_orders_claimed", {
    customerId: customer.id,
    candidateCount: candidates.length,
    claimedCount,
  });

  if (claimedCount === 0) {
    return {
      ok: false,
      message: "Es wurde keine Bestellung zugeordnet. Bitte die Liste neu laden.",
    };
  }

  return { ok: true, claimedCount };
}

/**
 * Ordnet passende Gastbestellungen nach E-Mail-Verifikation oder Anmeldung automatisch zu.
 * Fehler blockieren den Aufrufer nicht — Verifikation/Login bleiben erfolgreich.
 */
export async function autoClaimGuestOrdersAfterVerification(
  customerId: string,
): Promise<number> {
  try {
    const result = await claimGuestOrdersForCustomer(customerId);
    if (result.ok) {
      if (result.claimedCount > 0) {
        log.info("guest_orders_auto_claimed", {
          customerId,
          claimedCount: result.claimedCount,
        });
      }
      return result.claimedCount;
    }
    log.warn("guest_orders_auto_claim_skipped", {
      customerId,
      message: result.message,
    });
    return 0;
  } catch (e) {
    log.error("guest_orders_auto_claim_failed", { customerId, error: String(e) });
    return 0;
  }
}
