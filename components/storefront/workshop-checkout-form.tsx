"use client";

/**
 * Eigenständiger Termin-Checkout — bewusst OHNE useActionState und OHNE Server-Action-Imports.
 * CheckoutForm bindet submitCheckout (mit redirect()) per useActionState; das triggert in
 * Production React #441 auch dann, wenn das Formular per MPA absendet.
 */

import Link from "next/link";
import { useState } from "react";
import { SmartAddressFields } from "@/components/storefront/smart-address-fields";
import {
  CheckoutSummaryAside,
  type CheckoutSummaryLine,
} from "@/components/storefront/checkout-summary-aside";
import type {
  CheckoutAddressPrefill,
  CustomerAddressListItem,
} from "@/features/customers/checkout-prefill";

const formControlBase =
  "box-border min-h-[44px] w-full rounded-md border border-[#d2d5d9] bg-white px-3 text-sm leading-normal text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1";
const inputClass = `${formControlBase} py-[10px]`;
const selectClass = `${formControlBase} py-[10px] appearance-none`;
const labelClass = "mb-1 block text-sm text-[#6b7280]";

type Totals = {
  shippingCents: number;
  taxAmountCents: number;
  totalCents: number;
  vatApplies: boolean;
  catalogSubtotalBeforeDiscountCents: number;
};

export function WorkshopCheckoutForm({
  idempotencyKey,
  workshopBookingId,
  lines,
  totals,
  currency,
  allowedShippingCountries,
  initialShippingCountry,
  addressPrefill,
  savedAddresses = [],
  canSaveAddressToAccount = false,
  submitLabel,
}: {
  idempotencyKey: string;
  workshopBookingId: string;
  lines: CheckoutSummaryLine[];
  totals: Totals;
  currency: string;
  allowedShippingCountries: { code: string; label: string }[];
  initialShippingCountry: string;
  addressPrefill?: CheckoutAddressPrefill | null;
  savedAddresses?: CustomerAddressListItem[];
  canSaveAddressToAccount?: boolean;
  submitLabel: string;
}) {
  const prefillCountry =
    addressPrefill?.shippingCountry &&
    allowedShippingCountries.some((c) => c.code === addressPrefill.shippingCountry)
      ? addressPrefill.shippingCountry
      : initialShippingCountry;

  const [shippingCountry, setShippingCountry] = useState(prefillCountry);
  const [billingDifferent, setBillingDifferent] = useState(
    addressPrefill?.billingUseShipping === "no",
  );
  const [billingCountry, setBillingCountry] = useState(
    addressPrefill?.billingCountry ?? prefillCountry,
  );

  const shippingCountryLabel =
    allowedShippingCountries.find((c) => c.code === shippingCountry)?.label ?? shippingCountry;

  const savedShipping = savedAddresses.filter((a) => a.kind === "shipping");
  const defaultShipping = savedShipping.find((a) => a.isDefault) ?? savedShipping[0];

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
        <input type="hidden" name="billingUseShipping" value={billingDifferent ? "no" : "yes"} />

        <h1 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">Termin-Checkout</h1>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1f2937]">Kontakt</h2>
          <div className="mt-4 max-w-md">
            <label htmlFor="email" className={labelClass}>
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={addressPrefill?.email ?? ""}
              className={inputClass}
            />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Lieferadresse</h2>

          {savedShipping.length > 0 ? (
            <div className="mt-4 max-w-md">
              <label htmlFor="shippingAddressId" className={labelClass}>
                Gespeicherte Adresse
              </label>
              <select
                id="shippingAddressId"
                name="shippingAddressId"
                className={selectClass}
                defaultValue={defaultShipping?.id ?? ""}
                onChange={(e) => {
                  const addr = savedShipping.find((a) => a.id === e.target.value);
                  if (addr && allowedShippingCountries.some((c) => c.code === addr.country)) {
                    setShippingCountry(addr.country);
                  }
                }}
              >
                <option value="">Neue Adresse eingeben</option>
                {savedShipping.map((a) => (
                  <option key={a.id} value={a.id}>
                    {[a.label, `${a.firstName} ${a.lastName}`, `${a.zip} ${a.city}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-4 grid max-w-md gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="shippingFirstName" className={labelClass}>
                Vorname
              </label>
              <input
                id="shippingFirstName"
                name="shippingFirstName"
                required
                autoComplete="shipping given-name"
                defaultValue={addressPrefill?.shippingFirstName ?? ""}
                className={inputClass}
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
                defaultValue={addressPrefill?.shippingLastName ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4 max-w-md">
            <label htmlFor="shippingCompany" className={labelClass}>
              Firma (optional)
            </label>
            <input
              id="shippingCompany"
              name="shippingCompany"
              autoComplete="shipping organization"
              defaultValue={addressPrefill?.shippingCompany ?? ""}
              className={inputClass}
            />
          </div>

          <div className="mt-4 max-w-md">
            <label htmlFor="shippingCountry" className={labelClass}>
              Land / Region
            </label>
            <select
              id="shippingCountry"
              name="shippingCountry"
              required
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

          <div className="mt-4 max-w-md">
            <SmartAddressFields
              key={`ship-${shippingCountry}`}
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
              defaultValues={{
                zip: addressPrefill?.shippingZip ?? "",
                city: addressPrefill?.shippingCity ?? "",
                line1: addressPrefill?.shippingLine1 ?? "",
                line2: addressPrefill?.shippingLine2 ?? "",
              }}
              required
              autoCompleteScope="shipping"
              inputClass={inputClass}
              labelClass={labelClass}
            />
          </div>

          {canSaveAddressToAccount ? (
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
              <input
                type="checkbox"
                name="saveShippingAddress"
                value="1"
                className="mt-0.5 size-4 checkbox-primary"
              />
              <span>Diese Lieferadresse in meinem Konto speichern</span>
            </label>
          ) : null}

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
            <input
              type="checkbox"
              className="mt-0.5 size-4 checkbox-primary"
              checked={billingDifferent}
              onChange={(e) => setBillingDifferent(e.target.checked)}
            />
            <span>Rechnungsadresse weicht ab</span>
          </label>

          {billingDifferent ? (
            <div className="mt-6 space-y-4 border-t border-(--surface-muted) pt-6">
              <h3 className="text-base font-semibold text-[#1f2937]">Rechnungsadresse</h3>
              <div className="grid max-w-md gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingFirstName" className={labelClass}>
                    Vorname
                  </label>
                  <input
                    id="billingFirstName"
                    name="billingFirstName"
                    required
                    defaultValue={addressPrefill?.billingFirstName ?? ""}
                    className={inputClass}
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
                    defaultValue={addressPrefill?.billingLastName ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="max-w-md">
                <label htmlFor="billingCountry" className={labelClass}>
                  Land / Region
                </label>
                <select
                  id="billingCountry"
                  name="billingCountry"
                  required
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
              <div className="max-w-md">
                <SmartAddressFields
                  key={`bill-${billingCountry}`}
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
                  defaultValues={{
                    zip: addressPrefill?.billingZip ?? "",
                    city: addressPrefill?.billingCity ?? "",
                    line1: addressPrefill?.billingLine1 ?? "",
                    line2: addressPrefill?.billingLine2 ?? "",
                  }}
                  required
                  autoCompleteScope="billing"
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Zahlung</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            {totals.totalCents === 0
              ? "Kostenlos — keine Zahlung nötig."
              : "Nach dem Absenden weiter zu PayPal."}
          </p>
        </section>

        <div className="mt-8 max-w-md">
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
              className="mt-0.5 size-4 shrink-0 checkbox-primary"
            />
            <span>
              Ich habe die{" "}
              <Link href="/agb" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                AGB
              </Link>{" "}
              und das{" "}
              <Link href="/widerruf" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                Widerrufsrecht
              </Link>{" "}
              gelesen und die{" "}
              <Link href="/datenschutz" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                Datenschutzerklärung
              </Link>{" "}
              zur Kenntnis genommen.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) lg:max-w-md"
        >
          {submitLabel}
        </button>
      </div>

      <CheckoutSummaryAside
        lines={lines}
        shippingCents={totals.shippingCents}
        taxAmountCents={totals.taxAmountCents}
        totalCents={totals.totalCents}
        vatApplies={totals.vatApplies}
        currency={currency}
        catalogSubtotalBeforeDiscountCents={totals.catalogSubtotalBeforeDiscountCents}
        discountOffSubtotalCents={0}
        shippingSavedByPromotionCents={0}
        shippingCountryLabel={shippingCountryLabel}
      />
    </form>
  );
}
