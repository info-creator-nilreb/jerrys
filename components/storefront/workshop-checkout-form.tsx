"use client";

/**
 * Eigenständiger Termin-Checkout — bewusst OHNE useActionState und OHNE Server-Action-Imports.
 * CheckoutForm bindet submitCheckout (mit redirect()) per useActionState; das triggert in
 * Production React #441 auch dann, wenn das Formular per MPA absendet.
 *
 * UI/Abschnitte bewusst parallel zum regulären CheckoutForm (gleiche Feldbreiten, Zahlungsarten, Aside).
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { SmartAddressFields } from "@/components/storefront/smart-address-fields";
import {
  CheckoutSummaryAside,
  type CheckoutSummaryLine,
} from "@/components/storefront/checkout-summary-aside";
import {
  CheckoutPaymentMethods,
  type CheckoutPayPalMethodId,
} from "@/components/storefront/checkout-payment-methods";
import { computeCheckoutOrderTotals } from "@/lib/tax/order-price-totals";
import type {
  CheckoutAddressPrefill,
  CustomerAddressListItem,
} from "@/features/customers/checkout-prefill";

const formControlBase =
  "box-border min-h-[44px] w-full rounded-md border border-[#d2d5d9] bg-white px-3 text-sm leading-normal text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1";
const inputClass = `${formControlBase} py-[10px]`;
const selectClass = `${formControlBase} py-[10px] appearance-none`;
const labelClass = "mb-1 block text-sm text-[#6b7280]";

const NEW_ADDRESS_OPTION = "";

type AddressPersonFields = {
  firstName: string;
  lastName: string;
  company: string;
};

const EMPTY_PERSON: AddressPersonFields = { firstName: "", lastName: "", company: "" };

function personFromAddress(address: CustomerAddressListItem): AddressPersonFields {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    company: address.company ?? "",
  };
}

function savedAddressOptionLabel(address: CustomerAddressListItem): string {
  const parts = [
    address.label,
    `${address.firstName} ${address.lastName}`.trim(),
    address.line1,
    `${address.zip} ${address.city}`.trim(),
  ].filter((p): p is string => Boolean(p && p.length));
  const text = parts.join(" · ");
  return address.isDefault ? `${text} (Standard)` : text;
}

export function WorkshopCheckoutForm({
  idempotencyKey,
  workshopBookingId,
  lines,
  shippingRatesByCountry,
  freeShippingFromSubtotalGrossCents,
  currency,
  allowedShippingCountries,
  initialShippingCountry,
  addressPrefill,
  savedAddresses = [],
  canSaveAddressToAccount = false,
  payPalConfigured,
  checkoutError = null,
}: {
  idempotencyKey: string;
  workshopBookingId: string;
  lines: CheckoutSummaryLine[];
  shippingRatesByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
  currency: string;
  allowedShippingCountries: { code: string; label: string }[];
  initialShippingCountry: string;
  addressPrefill?: CheckoutAddressPrefill | null;
  savedAddresses?: CustomerAddressListItem[];
  canSaveAddressToAccount?: boolean;
  payPalConfigured: boolean;
  checkoutError?: string | null;
}) {
  const prefillCountry =
    addressPrefill?.shippingCountry &&
    allowedShippingCountries.some((c) => c.code === addressPrefill.shippingCountry)
      ? addressPrefill.shippingCountry
      : initialShippingCountry;

  const [billingDifferent, setBillingDifferent] = useState(
    addressPrefill?.billingUseShipping === "no",
  );
  const [payPalSurface, setPayPalSurface] = useState<CheckoutPayPalMethodId>("paypal");
  const [shippingCountry, setShippingCountry] = useState(prefillCountry);
  const [billingCountry, setBillingCountry] = useState(
    addressPrefill?.billingCountry ?? prefillCountry,
  );

  const savedShippingAddresses = useMemo(
    () => savedAddresses.filter((a) => a.kind === "shipping"),
    [savedAddresses],
  );
  const savedBillingAddresses = useMemo(
    () => savedAddresses.filter((a) => a.kind === "billing"),
    [savedAddresses],
  );

  const [shippingAddressId, setShippingAddressId] = useState(
    () => savedAddresses.find((a) => a.kind === "shipping" && a.isDefault)?.id ?? NEW_ADDRESS_OPTION,
  );
  const [billingAddressId, setBillingAddressId] = useState(
    () => savedAddresses.find((a) => a.kind === "billing" && a.isDefault)?.id ?? NEW_ADDRESS_OPTION,
  );

  const [shippingPerson, setShippingPerson] = useState<AddressPersonFields>(() => ({
    firstName: addressPrefill?.shippingFirstName ?? "",
    lastName: addressPrefill?.shippingLastName ?? "",
    company: addressPrefill?.shippingCompany ?? "",
  }));
  const [billingPerson, setBillingPerson] = useState<AddressPersonFields>(() => ({
    firstName: addressPrefill?.billingFirstName ?? "",
    lastName: addressPrefill?.billingLastName ?? "",
    company: addressPrefill?.billingCompany ?? "",
  }));

  const [shippingAddressValues, setShippingAddressValues] = useState(() => ({
    zip: addressPrefill?.shippingZip ?? "",
    city: addressPrefill?.shippingCity ?? "",
    line1: addressPrefill?.shippingLine1 ?? "",
    line2: addressPrefill?.shippingLine2 ?? "",
  }));
  const [billingAddressValues, setBillingAddressValues] = useState(() => ({
    zip: addressPrefill?.billingZip ?? "",
    city: addressPrefill?.billingCity ?? "",
    line1: addressPrefill?.billingLine1 ?? "",
    line2: addressPrefill?.billingLine2 ?? "",
  }));

  const lineInputs = useMemo(
    () =>
      lines.map((l) => ({
        quantity: l.quantity,
        priceGrossCents: l.product.priceGrossCents,
        taxRatePercent: l.product.taxRatePercent,
      })),
    [lines],
  );

  const catalogSubtotalBeforeDiscountCents = useMemo(
    () => lineInputs.reduce((s, l) => s + l.quantity * l.priceGrossCents, 0),
    [lineInputs],
  );

  const displayTotals = useMemo(
    () =>
      computeCheckoutOrderTotals({
        lines: lineInputs,
        shippingCountryCode: shippingCountry,
        shippingRatesCentsByCountry: shippingRatesByCountry,
        freeShippingFromSubtotalGrossCents,
      }),
    [lineInputs, shippingCountry, shippingRatesByCountry, freeShippingFromSubtotalGrossCents],
  );

  const shippingCountryLabel =
    allowedShippingCountries.find((c) => c.code === shippingCountry)?.label ?? shippingCountry;

  const submitLabel =
    displayTotals.totalCents === 0 ? "Jetzt verbindlich buchen" : "Weiter zur Zahlung";

  const applySavedShippingAddress = (id: string) => {
    setShippingAddressId(id);
    const address = savedShippingAddresses.find((a) => a.id === id);
    if (!address) {
      setShippingPerson(EMPTY_PERSON);
      setShippingAddressValues({ zip: "", city: "", line1: "", line2: "" });
      setShippingCountry(initialShippingCountry);
      return;
    }
    setShippingPerson(personFromAddress(address));
    setShippingAddressValues({
      zip: address.zip,
      city: address.city,
      line1: address.line1,
      line2: address.line2 ?? "",
    });
    if (allowedShippingCountries.some((c) => c.code === address.country)) {
      setShippingCountry(address.country);
    }
  };

  const applySavedBillingAddress = (id: string) => {
    setBillingAddressId(id);
    const address = savedBillingAddresses.find((a) => a.id === id);
    if (!address) {
      setBillingPerson(EMPTY_PERSON);
      setBillingAddressValues({ zip: "", city: "", line1: "", line2: "" });
      setBillingCountry(shippingCountry);
      return;
    }
    setBillingPerson(personFromAddress(address));
    setBillingAddressValues({
      zip: address.zip,
      city: address.city,
      line1: address.line1,
      line2: address.line2 ?? "",
    });
    if (allowedShippingCountries.some((c) => c.code === address.country)) {
      setBillingCountry(address.country);
    }
  };

  return (
    <form
      id="workshop-checkout-form"
      action="/api/workshop/complete-checkout"
      method="post"
      className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start"
    >
      <div className="order-2 min-w-0 border-b border-(--surface-muted) bg-white px-4 py-10 sm:px-8 lg:order-1 lg:border-b-0 lg:pr-12 lg:pl-0">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="workshopBookingId" value={workshopBookingId} />
        <input type="hidden" name="paymentMethod" value="paypal" />

        <h1 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">Termin-Checkout</h1>

        {checkoutError ? (
          <div
            className="mt-4 max-w-lg rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <p className="font-medium">{checkoutError}</p>
          </div>
        ) : null}

        <section id="checkout-section-contact" className="mt-10 scroll-mt-24">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#1f2937]">Kontakt</h2>
            <span className="text-sm text-[#9ca3af]">Anmelden</span>
          </div>
          <div className="mt-4">
            <label htmlFor="email" className="sr-only">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="E-Mail-Adresse oder Mobiltelefonnummer"
              defaultValue={addressPrefill?.email ?? ""}
              className={inputClass}
            />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              name="newsletter"
              autoComplete="off"
              className="size-4 checkbox-primary"
              disabled
            />
            Neuigkeiten und Angebote via E-Mail erhalten
          </label>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Lieferung</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-[#e5e7eb] p-1">
            <span className="rounded-md bg-[#f3f4f6] px-4 py-3 text-center text-sm font-medium text-[#1f2937]">
              Versand
            </span>
            <span className="rounded-md px-4 py-3 text-center text-sm text-[#9ca3af]">Abholung</span>
          </div>

          <div className="mt-8 space-y-4">
            {savedShippingAddresses.length > 0 ? (
              <div>
                <label htmlFor="shippingSavedAddress" className={labelClass}>
                  Gespeicherte Lieferadresse
                </label>
                <select
                  id="shippingSavedAddress"
                  className={selectClass}
                  value={shippingAddressId}
                  onChange={(e) => applySavedShippingAddress(e.target.value)}
                >
                  {savedShippingAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {savedAddressOptionLabel(address)}
                    </option>
                  ))}
                  <option value={NEW_ADDRESS_OPTION}>Neue Adresse eingeben …</option>
                </select>
                <p className="mt-1 text-sm text-[#6b7280]">
                  <Link
                    href="/konto/adressen"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Adressen verwalten
                  </Link>
                </p>
              </div>
            ) : null}

            <div>
              <label htmlFor="shippingCountry" className={labelClass}>
                Land / Region
              </label>
              <select
                id="shippingCountry"
                name="shippingCountry"
                required
                autoComplete="shipping country"
                className={selectClass}
                value={shippingCountry}
                onChange={(e) => setShippingCountry(e.target.value)}
              >
                {allowedShippingCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="shippingFirstName" className={labelClass}>
                  Vorname
                </label>
                <input
                  id="shippingFirstName"
                  name="shippingFirstName"
                  required
                  autoComplete="shipping given-name"
                  className={inputClass}
                  value={shippingPerson.firstName}
                  onChange={(e) =>
                    setShippingPerson((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="shippingLastName" className={labelClass}>
                  Nachname
                </label>
                <input
                  id="shippingLastName"
                  name="shippingLastName"
                  required
                  autoComplete="shipping family-name"
                  className={inputClass}
                  value={shippingPerson.lastName}
                  onChange={(e) =>
                    setShippingPerson((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label htmlFor="shippingCompany" className={labelClass}>
                Firma (optional)
              </label>
              <input
                id="shippingCompany"
                name="shippingCompany"
                autoComplete="shipping organization"
                className={inputClass}
                value={shippingPerson.company}
                onChange={(e) =>
                  setShippingPerson((prev) => ({ ...prev, company: e.target.value }))
                }
              />
            </div>

            <SmartAddressFields
              key={`shipping-${shippingAddressId || "neu"}`}
              country={shippingCountry}
              names={{
                zip: "shippingZip",
                city: "shippingCity",
                line1: "shippingLine1",
                line2: "shippingLine2",
              }}
              labels={{
                zip: "Postleitzahl",
                city: "Stadt",
                line1: "Straße und Hausnummer",
                line2: "Wohnung, Zimmer, usw. (optional)",
              }}
              defaultValues={shippingAddressValues}
              required
              autoCompleteScope="shipping"
              inputClass={inputClass}
              labelClass={labelClass}
            />

            {canSaveAddressToAccount && shippingAddressId === NEW_ADDRESS_OPTION ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  name="saveShippingAddress"
                  value="1"
                  defaultChecked={savedShippingAddresses.length === 0}
                  className="mt-0.5 size-4 checkbox-primary"
                />
                <span>Diese Lieferadresse in meinem Konto speichern</span>
              </label>
            ) : null}

            <div>
              <label
                htmlFor="phone"
                className={labelClass}
                title="Optional. Für Rückfragen zur Lieferung."
              >
                Telefon (optional)
              </label>
              <p id="workshop-checkout-phone-hint" className="sr-only">
                Optional. Für Rückfragen zur Lieferung.
              </p>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="shipping tel"
                className={inputClass}
                aria-describedby="workshop-checkout-phone-hint"
              />
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Rechnung</h2>
          <div className="mt-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
              <input
                type="checkbox"
                className="mt-0.5 size-4 checkbox-primary"
                checked={billingDifferent}
                onChange={(e) => setBillingDifferent(e.target.checked)}
              />
              <span>Abweichende Rechnungsadresse</span>
            </label>
            <input
              type="hidden"
              name="billingUseShipping"
              value={billingDifferent ? "no" : "yes"}
            />
          </div>

          {billingDifferent ? (
            <div className="mt-6 space-y-4">
              {savedBillingAddresses.length > 0 ? (
                <div>
                  <label htmlFor="billingSavedAddress" className={labelClass}>
                    Gespeicherte Rechnungsadresse
                  </label>
                  <select
                    id="billingSavedAddress"
                    className={selectClass}
                    value={billingAddressId}
                    onChange={(e) => applySavedBillingAddress(e.target.value)}
                  >
                    {savedBillingAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {savedAddressOptionLabel(address)}
                      </option>
                    ))}
                    <option value={NEW_ADDRESS_OPTION}>Neue Adresse eingeben …</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label htmlFor="billingCountry" className={labelClass}>
                  Land / Region (Rechnung)
                </label>
                <select
                  id="billingCountry"
                  name="billingCountry"
                  required
                  autoComplete="billing country"
                  className={selectClass}
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value)}
                >
                  {allowedShippingCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingFirstName" className={labelClass}>
                    Vorname
                  </label>
                  <input
                    id="billingFirstName"
                    name="billingFirstName"
                    required
                    autoComplete="billing given-name"
                    className={inputClass}
                    value={billingPerson.firstName}
                    onChange={(e) =>
                      setBillingPerson((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="billingLastName" className={labelClass}>
                    Nachname
                  </label>
                  <input
                    id="billingLastName"
                    name="billingLastName"
                    required
                    autoComplete="billing family-name"
                    className={inputClass}
                    value={billingPerson.lastName}
                    onChange={(e) =>
                      setBillingPerson((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label htmlFor="billingCompany" className={labelClass}>
                  Firma (optional)
                </label>
                <input
                  id="billingCompany"
                  name="billingCompany"
                  autoComplete="billing organization"
                  className={inputClass}
                  value={billingPerson.company}
                  onChange={(e) =>
                    setBillingPerson((prev) => ({ ...prev, company: e.target.value }))
                  }
                />
              </div>

              <SmartAddressFields
                key={`billing-${billingAddressId || "neu"}`}
                country={billingCountry}
                names={{
                  zip: "billingZip",
                  city: "billingCity",
                  line1: "billingLine1",
                  line2: "billingLine2",
                }}
                labels={{
                  zip: "Postleitzahl",
                  city: "Stadt",
                  line1: "Straße und Hausnummer",
                  line2: "Adresszusatz (optional)",
                }}
                defaultValues={billingAddressValues}
                required
                autoCompleteScope="billing"
                inputClass={inputClass}
                labelClass={labelClass}
              />

              {canSaveAddressToAccount && billingAddressId === NEW_ADDRESS_OPTION ? (
                <label className="flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    name="saveBillingAddress"
                    value="1"
                    defaultChecked={savedBillingAddresses.length === 0}
                    className="mt-0.5 size-4 checkbox-primary"
                  />
                  <span>Diese Rechnungsadresse in meinem Konto speichern</span>
                </label>
              ) : null}
            </div>
          ) : null}
        </section>

        <section id="checkout-section-zahlung" className="mt-12 scroll-mt-24">
          <h2 className="text-lg font-semibold text-[#1f2937]">Zahlung</h2>
          {displayTotals.totalCents === 0 ? (
            <p className="mt-2 text-sm text-[#6b7280]">Kostenlos — keine Zahlung nötig.</p>
          ) : payPalConfigured ? (
            <CheckoutPaymentMethods
              value={payPalSurface}
              onChange={setPayPalSurface}
              submitLabel={submitLabel}
              cardInline={false}
            />
          ) : (
            <p className="mt-2 text-sm text-[#6b7280]">Online-Zahlung ist derzeit nicht verfügbar.</p>
          )}
        </section>

        <div id="checkout-section-rechtliches" className="mt-8 max-w-md scroll-mt-24">
          <label
            htmlFor="rechtlicheKenntnis"
            className="flex min-h-11 cursor-pointer items-start gap-3 text-left text-sm leading-snug text-[#6b7280]"
          >
            <input
              id="rechtlicheKenntnis"
              name="rechtlicheKenntnis"
              type="checkbox"
              value="on"
              required
              autoComplete="off"
              className="mt-1 size-4 shrink-0 checkbox-primary"
            />
            <span>
              Ich habe die{" "}
              <Link
                href="/agb"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                AGB
              </Link>
              , die{" "}
              <Link
                href="/widerruf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Widerrufsbelehrung
              </Link>{" "}
              und die{" "}
              <Link
                href="/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Datenschutzerklärung
              </Link>{" "}
              gelesen und zur Kenntnis genommen.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) lg:max-w-md"
        >
          {submitLabel}
        </button>

        <nav
          aria-label="Rechtliche Informationen"
          className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#6b7280] underline-offset-2"
        >
          <Link
            href="/widerruf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-(--primary-hover) hover:underline"
          >
            Widerrufsrecht
          </Link>
          <Link
            href="/rueckgabe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-(--primary-hover) hover:underline"
          >
            Rückgabe
          </Link>
          <Link
            href="/versand"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-(--primary-hover) hover:underline"
          >
            Versand
          </Link>
          <Link
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-(--primary-hover) hover:underline"
          >
            Datenschutz
          </Link>
          <Link
            href="/agb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-(--primary-hover) hover:underline"
          >
            AGB
          </Link>
          <Link
            href="/impressum"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-(--primary-hover) hover:underline"
          >
            Impressum
          </Link>
        </nav>
      </div>

      <CheckoutSummaryAside
        lines={lines}
        shippingCents={displayTotals.shippingCents}
        taxAmountCents={displayTotals.taxAmountCents}
        totalCents={displayTotals.totalCents}
        vatApplies={displayTotals.vatApplies}
        currency={currency}
        catalogSubtotalBeforeDiscountCents={catalogSubtotalBeforeDiscountCents}
        discountOffSubtotalCents={0}
        shippingSavedByPromotionCents={0}
        shippingCountryLabel={shippingCountryLabel}
        freeShippingFromSubtotalGrossCents={freeShippingFromSubtotalGrossCents}
      />
    </form>
  );
}
