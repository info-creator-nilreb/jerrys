import { describe, expect, it } from "vitest";
import {
  billingAddressFromOrder,
  orderAddressText,
  orderAddressesTwoColumnHtml,
  orderBillingAddressHtml,
  orderInvoiceShippedNoteHtml,
  orderShippingAddressAndTrackingHtml,
  orderShippingAddressHtml,
  orderTrackingCtaHtml,
  orderTrackingSectionHtml,
  shippingAddressFromOrder,
  type OrderAddressSource,
} from "@/lib/email/templates/order-fragments";

const sampleOrder: OrderAddressSource = {
  deliveryMethod: "shipping",
  email: "kunde@example.com",
  shippingFirstName: "Alex",
  shippingLastName: "Muster",
  shippingCompany: null,
  shippingLine1: "Musterstraße 12",
  shippingLine2: null,
  shippingZip: "10115",
  shippingCity: "Berlin",
  shippingCountry: "DE",
  billingFirstName: "Alex",
  billingLastName: "Muster",
  billingCompany: "Muster GmbH",
  billingLine1: "Rechnungsweg 3",
  billingLine2: "Etage 2",
  billingZip: "10117",
  billingCity: "Berlin",
  billingCountry: "DE",
};

describe("order address fragments", () => {
  it("formatiert Adressen als mehrzeiligen Text", () => {
    const shipping = shippingAddressFromOrder(sampleOrder);
    expect(orderAddressText(shipping)).toBe(
      "Alex Muster\nMusterstraße 12\n10115 Berlin\nDeutschland",
    );

    const billing = billingAddressFromOrder(sampleOrder);
    expect(orderAddressText(billing)).toContain("Muster GmbH");
    expect(orderAddressText(billing)).toContain("Rechnungsweg 3");
    expect(orderAddressText(billing)).toContain("Etage 2");
  });

  it("rendert Versandadresse und Rechnungsadresse als HTML", () => {
    const shippingHtml = orderShippingAddressHtml(sampleOrder);
    expect(shippingHtml).toContain("Versandadresse");
    expect(shippingHtml).toContain("Musterstraße 12");

    const billingHtml = orderBillingAddressHtml(sampleOrder);
    expect(billingHtml).toContain("Rechnungsadresse");
    expect(billingHtml).toContain("Rechnungsweg 3");
    expect(billingHtml).toContain('href="mailto:kunde@example.com"');
  });

  it("nutzt Abholung als Titel bei Pickup", () => {
    const pickupHtml = orderShippingAddressHtml({ ...sampleOrder, deliveryMethod: "pickup" });
    expect(pickupHtml).toContain("Abholung");
    expect(pickupHtml).not.toContain("Versandadresse");
  });

  it("baut Zwei-Spalten-Block für Bestellbestätigung", () => {
    const html = orderAddressesTwoColumnHtml(sampleOrder);
    expect(html).toContain("Versandadresse");
    expect(html).toContain("Rechnungsadresse");
    expect(html).toContain("Musterstraße 12");
    expect(html).toContain("Rechnungsweg 3");
    expect(html).toContain('href="mailto:kunde@example.com"');
  });

  it("baut Versandadresse mit Tracking-Spalte für Versandmail", () => {
    const html = orderShippingAddressAndTrackingHtml(sampleOrder, {
      carrierLine: "DHL · 1234567890",
      trackUrl: "https://nolp.dhl.de/track?id=123",
      primaryColor: "#22c55e",
    });
    expect(html).toContain("Versandadresse");
    expect(html).toContain("Musterstraße 12");
    expect(html).toContain("Versand &amp; Tracking");
    expect(html).toContain("DHL · 1234567890");
    expect(html).toContain("https://nolp.dhl.de/track?id=123");
  });

  it("rendert Rechnungshinweis für Versandmail", () => {
    const withPdf = orderInvoiceShippedNoteHtml("RE-2026-0042", true);
    expect(withPdf).toContain("RE-2026-0042");
    expect(withPdf).toContain("PDF-Anhang");

    expect(orderInvoiceShippedNoteHtml(null, false)).toBe("");
  });

  it("rendert Tracking-CTA und -Sektion nur bei URL", () => {
    const branding = {
      primary: "#22c55e",
      primaryStrong: "#16a34a",
      shopName: "jerry's",
      logoAbsoluteUrl: null,
      instagramUrl: null,
      footerIdentityLine: "jerry's · Berlin",
      emailFromName: "jerry's",
    };

    expect(orderTrackingCtaHtml(null, branding)).toBe("");
    expect(orderTrackingSectionHtml(null, branding)).toBe("");

    const cta = orderTrackingCtaHtml("https://track.example/1", branding);
    expect(cta).toContain("Sendungsverfolgung");
    expect(cta).toContain("https://track.example/1");

    const section = orderTrackingSectionHtml("https://track.example/1", branding);
    expect(section).toContain("Du kannst den Status deiner Lieferung verfolgen");
    expect(section).toContain("Sendungsverfolgung");
    expect(section).toContain("Sendungsdaten aktualisiert");
  });
});
