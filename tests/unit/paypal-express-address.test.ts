import { describe, expect, it } from "vitest";
import {
  expressAddressFromPayPalOrder,
  splitPersonName,
} from "@/lib/checkout/paypal-express-address";

describe("PayPal Express Adressmapping", () => {
  it("mappt PayPal Shipping + Payer-E-Mail auf Shop-Bestellfelder", () => {
    const address = expressAddressFromPayPalOrder({
      id: "PAYPAL-1",
      payer: {
        email_address: "kunde@example.com",
        name: { given_name: "Max", surname: "Mustermann" },
        phone: { phone_number: { national_number: "030123456" } },
      },
      purchase_units: [
        {
          custom_id: "order-1",
          shipping: {
            name: { full_name: "Max Mustermann" },
            address: {
              address_line_1: "Hauptstrasse 12",
              address_line_2: "2. OG",
              postal_code: "10115",
              admin_area_2: "Berlin",
              country_code: "DE",
            },
          },
        },
      ],
    });

    expect(address).toMatchObject({
      email: "kunde@example.com",
      phone: "030123456",
      shippingFirstName: "Max",
      shippingLastName: "Mustermann",
      shippingLine1: "Hauptstrasse 12",
      shippingLine2: "2. OG",
      shippingZip: "10115",
      shippingCity: "Berlin",
      shippingCountry: "DE",
      billingLine1: "Hauptstrasse 12",
    });
  });

  it("nutzt Apple-Pay-Shipping als Fallback, wenn PayPal keine Adresse liefert", () => {
    const address = expressAddressFromPayPalOrder(
      {
        id: "PAYPAL-APPLE-1",
        payer: { email_address: "apple@example.com" },
        purchase_units: [{ custom_id: "order-1" }],
      },
      {
        givenName: "Erika",
        familyName: "Musterfrau",
        addressLines: ["Apfelweg 5"],
        postalCode: "20095",
        locality: "Hamburg",
        countryCode: "de",
        phoneNumber: "040123456",
      },
    );

    expect(address).toMatchObject({
      email: "apple@example.com",
      phone: "040123456",
      shippingFirstName: "Erika",
      shippingLastName: "Musterfrau",
      shippingLine1: "Apfelweg 5",
      shippingZip: "20095",
      shippingCity: "Hamburg",
      shippingCountry: "DE",
    });
  });

  it("liefert null bei unvollständiger Lieferadresse", () => {
    expect(
      expressAddressFromPayPalOrder({
        id: "PAYPAL-2",
        payer: { email_address: "kunde@example.com" },
        purchase_units: [{ custom_id: "order-1" }],
      }),
    ).toBeNull();
  });

  it("splittet Einzelwort-Namen mit stabilem Nachnamen-Fallback", () => {
    expect(splitPersonName("Prince")).toEqual({ firstName: "Prince", lastName: "Kunde" });
  });
});
