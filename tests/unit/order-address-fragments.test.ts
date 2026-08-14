import { describe, expect, it } from "vitest";
import {
  billingAddressFromOrder,
  orderAddressText,
  orderAddressesTwoColumnHtml,
  orderBillingAddressHtml,
  orderShippingAddressAndTrackingHtml,
  orderShippingAddressHtml,
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

  it("zeigt Tracking-Link mit kurzem Anzeigenamen statt voller URL", () => {
    const trackUrl = "https://nolp.dhl.de/nextt-online-public/setShipmentOverview?lang=de&piececode=1234567890";
    const html = orderShippingAddressAndTrackingHtml(sampleOrder, {
      carrierLine: "DHL · 1234567890",
      trackUrl,
      primaryColor: "#8bbe25",
    });

    expect(html).toContain("Versand &amp; Tracking");
    expect(html).toContain('href="https://nolp.dhl.de/nextt-online-public/setShipmentOverview?lang=de&amp;piececode=1234567890"');
    expect(html).toContain("Sendung verfolgen");
    expect(html).not.toContain("piececode=1234567890</a>");
  });
});
