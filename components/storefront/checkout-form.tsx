"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { submitCheckout, type CheckoutActionState } from "@/app/(storefront)/checkout/actions";
import type { CheckoutSummaryLine } from "@/components/storefront/checkout-summary-aside";
import { CheckoutSummaryAside } from "@/components/storefront/checkout-summary-aside";
import { CartExpressPlaceholder } from "@/components/storefront/cart-express-placeholder";

const initial: CheckoutActionState = null;

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1";

export function CheckoutForm({
  idempotencyKey,
  lines,
  subtotalCents,
  shippingCents,
  currency,
}: {
  idempotencyKey: string;
  lines: CheckoutSummaryLine[];
  subtotalCents: number;
  shippingCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitCheckout, initial);
  const [billingDifferent, setBillingDifferent] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/checkout/erfolg?nr=${encodeURIComponent(state.orderNumber)}`);
    }
  }, [state, router]);

  const fe = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:gap-0">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="border-b border-(--surface-muted) bg-white px-4 py-10 sm:px-8 lg:border-b-0 lg:pr-12 lg:pl-0">
        <h1 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">Checkout</h1>

        <section className="mt-10">
          <p className="text-sm font-medium tracking-wide text-[#6b7280] uppercase">Express Checkout</p>
          <div className="mt-3">
            <CartExpressPlaceholder />
          </div>
          <div className="relative my-8 text-center text-sm text-[#9ca3af]">
            <span className="relative z-10 bg-white px-3">ODER</span>
            <div className="absolute inset-x-0 top-1/2 border-t border-[#e5e7eb]" aria-hidden />
          </div>
        </section>

        <section className="mt-2">
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
              className={inputClass}
            />
            {fe?.email ? <p className="mt-1 text-sm text-red-600">{fe.email}</p> : null}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-[#374151]">
            <input type="checkbox" name="newsletter" className="size-4 rounded border-[#d2d5d9]" disabled />
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
            <div>
              <label htmlFor="shippingCountry" className="mb-1 block text-sm text-[#6b7280]">
                Land / Region
              </label>
              <select id="shippingCountry" name="shippingCountry" className={inputClass} defaultValue="DE">
                <option value="DE">Deutschland</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="shippingFirstName" className="mb-1 block text-sm text-[#6b7280]">
                  Vorname
                </label>
                <input id="shippingFirstName" name="shippingFirstName" required className={inputClass} />
                {fe?.shippingFirstName ? (
                  <p className="mt-1 text-sm text-red-600">{fe.shippingFirstName}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="shippingLastName" className="mb-1 block text-sm text-[#6b7280]">
                  Nachname
                </label>
                <input id="shippingLastName" name="shippingLastName" required className={inputClass} />
                {fe?.shippingLastName ? (
                  <p className="mt-1 text-sm text-red-600">{fe.shippingLastName}</p>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="shippingCompany" className="mb-1 block text-sm text-[#6b7280]">
                Firma (optional)
              </label>
              <input id="shippingCompany" name="shippingCompany" className={inputClass} />
            </div>
            <div>
              <label htmlFor="shippingLine1" className="mb-1 block text-sm text-[#6b7280]">
                Adresse
              </label>
              <input id="shippingLine1" name="shippingLine1" required className={inputClass} />
              {fe?.shippingLine1 ? <p className="mt-1 text-sm text-red-600">{fe.shippingLine1}</p> : null}
            </div>
            <div>
              <label htmlFor="shippingLine2" className="mb-1 block text-sm text-[#6b7280]">
                Wohnung, Zimmer, usw. (optional)
              </label>
              <input id="shippingLine2" name="shippingLine2" className={inputClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="shippingZip" className="mb-1 block text-sm text-[#6b7280]">
                  Postleitzahl
                </label>
                <input
                  id="shippingZip"
                  name="shippingZip"
                  required
                  inputMode="numeric"
                  pattern="\d{5}"
                  className={inputClass}
                />
                {fe?.shippingZip ? <p className="mt-1 text-sm text-red-600">{fe.shippingZip}</p> : null}
              </div>
              <div>
                <label htmlFor="shippingCity" className="mb-1 block text-sm text-[#6b7280]">
                  Stadt
                </label>
                <input id="shippingCity" name="shippingCity" required className={inputClass} />
                {fe?.shippingCity ? <p className="mt-1 text-sm text-red-600">{fe.shippingCity}</p> : null}
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 flex items-center gap-1 text-sm text-[#6b7280]">
                Telefon (optional)
                <span className="text-[#9ca3af]" title="Für Rückfragen zur Lieferung">
                  ?
                </span>
              </label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Rechnung</h2>
          <div className="mt-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-[#d2d5d9] text-primary"
                checked={billingDifferent}
                onChange={(e) => setBillingDifferent(e.target.checked)}
              />
              <span>Abweichende Rechnungsadresse</span>
            </label>
            {!billingDifferent ? (
              <input type="hidden" name="billingUseShipping" value="yes" />
            ) : (
              <input type="hidden" name="billingUseShipping" value="no" />
            )}
          </div>
          {billingDifferent ? (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="billingCountry" className="mb-1 block text-sm text-[#6b7280]">
                  Land / Region (Rechnung)
                </label>
                <select id="billingCountry" name="billingCountry" className={inputClass} defaultValue="DE">
                  <option value="DE">Deutschland</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingFirstName" className="mb-1 block text-sm text-[#6b7280]">
                    Vorname
                  </label>
                  <input id="billingFirstName" name="billingFirstName" className={inputClass} />
                  {fe?.billingFirstName ? (
                    <p className="mt-1 text-sm text-red-600">{fe.billingFirstName}</p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="billingLastName" className="mb-1 block text-sm text-[#6b7280]">
                    Nachname
                  </label>
                  <input id="billingLastName" name="billingLastName" className={inputClass} />
                  {fe?.billingLastName ? (
                    <p className="mt-1 text-sm text-red-600">{fe.billingLastName}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <label htmlFor="billingCompany" className="mb-1 block text-sm text-[#6b7280]">
                  Firma (optional)
                </label>
                <input id="billingCompany" name="billingCompany" className={inputClass} />
              </div>
              <div>
                <label htmlFor="billingLine1" className="mb-1 block text-sm text-[#6b7280]">
                  Adresse
                </label>
                <input id="billingLine1" name="billingLine1" className={inputClass} />
                {fe?.billingLine1 ? <p className="mt-1 text-sm text-red-600">{fe.billingLine1}</p> : null}
              </div>
              <div>
                <label htmlFor="billingLine2" className="mb-1 block text-sm text-[#6b7280]">
                  Adresszusatz (optional)
                </label>
                <input id="billingLine2" name="billingLine2" className={inputClass} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingZip" className="mb-1 block text-sm text-[#6b7280]">
                    Postleitzahl
                  </label>
                  <input
                    id="billingZip"
                    name="billingZip"
                    inputMode="numeric"
                    pattern="\d{5}"
                    className={inputClass}
                  />
                  {fe?.billingZip ? <p className="mt-1 text-sm text-red-600">{fe.billingZip}</p> : null}
                </div>
                <div>
                  <label htmlFor="billingCity" className="mb-1 block text-sm text-[#6b7280]">
                    Stadt
                  </label>
                  <input id="billingCity" name="billingCity" className={inputClass} />
                  {fe?.billingCity ? <p className="mt-1 text-sm text-red-600">{fe.billingCity}</p> : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Zahlung</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Alle Transaktionen sind sicher und verschlüsselt (Demo ohne echte Zahlung).
          </p>
          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Zahlungsart</legend>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e5e7eb] p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
              <input type="radio" name="paymentMethod" value="vorkasse" defaultChecked className="size-4 text-primary" />
              <span className="text-sm font-medium text-[#1f2937]">Vorkasse</span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
              <span className="flex items-center gap-3">
                <input type="radio" name="paymentMethod" value="paypal" className="size-4 text-primary" />
                <span className="text-sm font-medium text-[#1f2937]">PayPal</span>
              </span>
              <span className="text-sm font-semibold text-[#003087]">PayPal</span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
              <span className="flex items-center gap-3">
                <input type="radio" name="paymentMethod" value="klarna" className="size-4 text-primary" />
                <span className="text-sm font-medium text-[#1f2937]">Klarna</span>
              </span>
              <span className="text-sm font-semibold text-[#ffb3c7]">Klarna</span>
            </label>
          </fieldset>
          {fe?.paymentMethod ? <p className="mt-1 text-sm text-red-600">{fe.paymentMethod}</p> : null}
        </section>

        {state && !state.ok ? <p className="mt-8 text-sm text-red-600">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-10 w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 lg:max-w-md"
        >
          {pending ? "Wird gesendet…" : "Jetzt bestellen"}
        </button>

        <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#6b7280] underline-offset-2">
          <Link href="/widerruf" className="text-primary hover:text-(--primary-hover) hover:underline">
            Widerrufsrecht
          </Link>
          <Link href="/versand" className="text-primary hover:text-(--primary-hover) hover:underline">
            Versand
          </Link>
          <Link href="/datenschutz" className="text-primary hover:text-(--primary-hover) hover:underline">
            Datenschutz
          </Link>
          <Link href="/agb" className="text-primary hover:text-(--primary-hover) hover:underline">
            AGB
          </Link>
          <Link href="/impressum" className="text-primary hover:text-(--primary-hover) hover:underline">
            Impressum
          </Link>
        </nav>
      </div>

      <CheckoutSummaryAside
        lines={lines}
        subtotalCents={subtotalCents}
        shippingCents={shippingCents}
        currency={currency}
      />
    </form>
  );
}
