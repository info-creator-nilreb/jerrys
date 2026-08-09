import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import { createOrderEvent } from "@/lib/orders/order-events";
import { getVerifiedActiveCustomerId } from "@/features/customers/application/get-verified-active-customer-id";
import { customerProfileUpdateSchema } from "@/features/customers/application/customer-privacy-schemas";

const log = createLogger("customers.privacy");

/** Auditereignis: Kontoverknüpfung einer Bestellung wurde entfernt (Anonymisierung). */
export const ORDER_EVENT_CUSTOMER_UNLINKED = "order.customer_unlinked" as const;

/** Bestätigungswort für die Konto-Löschung — verhindert versehentliche Auslösung. */
export const CUSTOMER_DELETE_CONFIRMATION = "LÖSCHEN";

export type CustomerDataExport = {
  exportedAt: string;
  hinweis: string;
  konto: {
    email: string;
    vorname: string | null;
    nachname: string | null;
    emailBestaetigtAm: string | null;
    kontoAktiv: boolean;
    letzteAnmeldungAm: string | null;
    erstelltAm: string;
  };
  anmeldeverfahren: { verfahren: string; verknuepftSeit: string }[];
  adressen: {
    art: string;
    bezeichnung: string | null;
    vorname: string;
    nachname: string;
    firma: string | null;
    strasse: string;
    adresszusatz: string | null;
    plz: string;
    ort: string;
    land: string;
    standard: boolean;
  }[];
  bestellungen: {
    bestellnummer: string;
    bestelltAm: string;
    status: string;
    versandstatus: string;
    email: string;
    telefon: string | null;
    zahlungsart: string;
    waehrung: string;
    zwischensummeBruttoCent: number;
    versandCent: number;
    rabattCent: number;
    steuerCent: number;
    gesamtBruttoCent: number;
    lieferadresse: Record<string, string | null>;
    rechnungsadresse: Record<string, string | null>;
    positionen: {
      artikel: string;
      sku: string | null;
      menge: number;
      einzelpreisBruttoCent: number;
      positionssummeBruttoCent: number;
    }[];
  }[];
};

const EXPORT_HINT =
  "Auskunft nach Art. 15 DSGVO. Enthalten sind Kontodaten, Anmeldeverfahren, gespeicherte Adressen und Bestellungen dieses Kontos. Passwörter und Anmelde-Token werden nicht exportiert, da sie ausschließlich als nicht rückrechenbare Prüfwerte gespeichert sind.";

function isoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Datenauskunft für das eigene Konto (Art. 15 DSGVO).
 *
 * Bewusst ohne Passwort-Hash und ohne Auth-Token: Beides sind Sicherheitsmerkmale, keine
 * Auskunftsdaten. Bestellungen werden mit ihren unveränderlichen Snapshots ausgegeben.
 */
export async function exportCustomerData(customerId: string): Promise<CustomerDataExport | null> {
  const verified = await getVerifiedActiveCustomerId(customerId);
  if (!verified) return null;

  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    where: { id: verified },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      identities: {
        select: { provider: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      addresses: {
        select: {
          kind: true,
          label: true,
          firstName: true,
          lastName: true,
          company: true,
          line1: true,
          line2: true,
          zip: true,
          city: true,
          country: true,
          isDefault: true,
        },
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      },
      orders: {
        select: {
          orderNumber: true,
          createdAt: true,
          status: true,
          fulfillmentStatus: true,
          email: true,
          phone: true,
          paymentMethod: true,
          currency: true,
          subtotalGrossCents: true,
          shippingCents: true,
          discountOffSubtotalCents: true,
          taxAmountCents: true,
          totalGrossCents: true,
          shippingFirstName: true,
          shippingLastName: true,
          shippingCompany: true,
          shippingLine1: true,
          shippingLine2: true,
          shippingZip: true,
          shippingCity: true,
          shippingCountry: true,
          billingFirstName: true,
          billingLastName: true,
          billingCompany: true,
          billingLine1: true,
          billingLine2: true,
          billingZip: true,
          billingCity: true,
          billingCountry: true,
          items: {
            select: {
              productTitleSnapshot: true,
              skuSnapshot: true,
              quantity: true,
              unitPriceGrossCents: true,
              lineTotalGrossCents: true,
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer) return null;

  log.info("customer_data_exported", { customerId: verified, orderCount: customer.orders.length });

  return {
    exportedAt: new Date().toISOString(),
    hinweis: EXPORT_HINT,
    konto: {
      email: customer.email,
      vorname: customer.firstName,
      nachname: customer.lastName,
      emailBestaetigtAm: isoOrNull(customer.emailVerifiedAt),
      kontoAktiv: customer.isActive,
      letzteAnmeldungAm: isoOrNull(customer.lastLoginAt),
      erstelltAm: customer.createdAt.toISOString(),
    },
    anmeldeverfahren: customer.identities.map((i) => ({
      verfahren: i.provider,
      verknuepftSeit: i.createdAt.toISOString(),
    })),
    adressen: customer.addresses.map((a) => ({
      art: a.kind,
      bezeichnung: a.label,
      vorname: a.firstName,
      nachname: a.lastName,
      firma: a.company,
      strasse: a.line1,
      adresszusatz: a.line2,
      plz: a.zip,
      ort: a.city,
      land: a.country,
      standard: a.isDefault,
    })),
    bestellungen: customer.orders.map((o) => ({
      bestellnummer: o.orderNumber,
      bestelltAm: o.createdAt.toISOString(),
      status: o.status,
      versandstatus: o.fulfillmentStatus,
      email: o.email,
      telefon: o.phone,
      zahlungsart: o.paymentMethod,
      waehrung: o.currency,
      zwischensummeBruttoCent: o.subtotalGrossCents,
      versandCent: o.shippingCents,
      rabattCent: o.discountOffSubtotalCents,
      steuerCent: o.taxAmountCents,
      gesamtBruttoCent: o.totalGrossCents,
      lieferadresse: {
        vorname: o.shippingFirstName,
        nachname: o.shippingLastName,
        firma: o.shippingCompany,
        strasse: o.shippingLine1,
        adresszusatz: o.shippingLine2,
        plz: o.shippingZip,
        ort: o.shippingCity,
        land: o.shippingCountry,
      },
      rechnungsadresse: {
        vorname: o.billingFirstName,
        nachname: o.billingLastName,
        firma: o.billingCompany,
        strasse: o.billingLine1,
        adresszusatz: o.billingLine2,
        plz: o.billingZip,
        ort: o.billingCity,
        land: o.billingCountry,
      },
      positionen: o.items.map((i) => ({
        artikel: i.productTitleSnapshot,
        sku: i.skuSnapshot,
        menge: i.quantity,
        einzelpreisBruttoCent: i.unitPriceGrossCents,
        positionssummeBruttoCent: i.lineTotalGrossCents,
      })),
    })),
  };
}

export type UpdateCustomerProfileResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/** Berichtigung nach Art. 16 DSGVO — Name. E-Mail-Wechsel verlangt erneute Verifikation. */
export async function updateCustomerProfile(
  customerId: string,
  input: unknown,
): Promise<UpdateCustomerProfileResult> {
  const verified = await getVerifiedActiveCustomerId(customerId);
  if (!verified) {
    return { ok: false, message: "Änderung nur mit bestätigter E-Mail-Adresse möglich." };
  }

  const parsed = customerProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key]!.push(issue.message);
    }
    return { ok: false, message: "Bitte Eingaben prüfen.", fieldErrors };
  }

  try {
    await getPrisma().customer.update({
      where: { id: verified },
      data: {
        firstName: parsed.data.firstName ?? null,
        lastName: parsed.data.lastName ?? null,
      },
    });
  } catch (e) {
    log.error("customer_profile_update_failed", { customerId: verified, error: String(e) });
    return {
      ok: false,
      message: "Die Änderung konnte gerade nicht gespeichert werden. Bitte später erneut versuchen.",
    };
  }

  log.info("customer_profile_updated", { customerId: verified });
  return { ok: true };
}

export type AnonymizeCustomerResult =
  | { ok: true; detachedOrderCount: number }
  | { ok: false; message: string };

/** Platzhalter-Adresse: eindeutig, nicht zustellbar, nicht auf die Person zurückführbar. */
function anonymizedEmailFor(customerId: string): string {
  return `geloescht+${customerId}@invalid`;
}

/**
 * Löschung nach Art. 17 DSGVO als **Anonymisierung**.
 *
 * Bestellungen bleiben mit ihren Snapshots erhalten — dafür bestehen handels- und
 * steuerrechtliche Aufbewahrungspflichten. Entfernt werden Login, Adressbuch, Tokens und
 * die Verknüpfung der Bestellungen mit dem Konto; jede Entkopplung wird auditiert.
 */
export async function anonymizeCustomerAccount(
  customerId: string,
): Promise<AnonymizeCustomerResult> {
  const verified = await getVerifiedActiveCustomerId(customerId);
  if (!verified) {
    return {
      ok: false,
      message: "Löschung nur mit bestätigter E-Mail-Adresse und aktivem Konto möglich.",
    };
  }

  const prisma = getPrisma();

  try {
    const orders = await prisma.order.findMany({
      where: { customerId: verified },
      select: { id: true, orderNumber: true },
    });

    await prisma.$transaction(async (tx) => {
      for (const order of orders) {
        const updated = await tx.order.updateMany({
          where: { id: order.id, customerId: verified },
          data: { customerId: null },
        });
        if (updated.count === 0) continue;
        await createOrderEvent(tx, order.id, ORDER_EVENT_CUSTOMER_UNLINKED, {
          reason: "customer_anonymized",
          orderNumber: order.orderNumber,
        });
      }

      await tx.customerAddress.deleteMany({ where: { customerId: verified } });
      await tx.customerAuthToken.deleteMany({ where: { customerId: verified } });
      await tx.customerIdentity.deleteMany({ where: { customerId: verified } });

      await tx.customer.update({
        where: { id: verified },
        data: {
          email: anonymizedEmailFor(verified),
          firstName: null,
          lastName: null,
          passwordHash: null,
          emailVerifiedAt: null,
          isActive: false,
          anonymizedAt: new Date(),
        },
      });
    });

    log.info("customer_account_anonymized", {
      customerId: verified,
      detachedOrderCount: orders.length,
    });
    return { ok: true, detachedOrderCount: orders.length };
  } catch (e) {
    log.error("customer_anonymize_failed", { customerId: verified, error: String(e) });
    return {
      ok: false,
      message: "Das Konto konnte gerade nicht gelöscht werden. Bitte später erneut versuchen.",
    };
  }
}
