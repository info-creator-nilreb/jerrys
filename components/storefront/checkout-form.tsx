"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
} from "react";
import { submitCheckout, type CheckoutActionState } from "@/app/(storefront)/checkout/actions";
import {
  previewCheckoutPromotion,
  type CheckoutPromotionPreview,
} from "@/app/(storefront)/checkout/promotion-actions";
import {
  AutomaticPromotionDismiss,
  CheckoutDiscountPanel,
} from "@/components/storefront/checkout-discount-panel";
import type { CheckoutSummaryLine } from "@/components/storefront/checkout-summary-aside";
import { CheckoutSummaryAside } from "@/components/storefront/checkout-summary-aside";
import {
  CheckoutPaymentMethods,
  type CheckoutPayPalMethodId,
} from "@/components/storefront/checkout-payment-methods";
import { PayPalCardFieldsCheckout } from "@/components/storefront/paypal-card-fields-checkout";
import { addressLine1HouseNumberMessage } from "@/lib/checkout/address-line-validation";
import { postalCodeErrorMessage } from "@/lib/checkout/postal-code-validation";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";
import { z } from "zod";

const initial: CheckoutActionState = null;

/** Formular-ID für Tests / Erweiterungen. */
export const STOREFRONT_CHECKOUT_FORM_ID = "storefront-checkout-form";

/** Einheitliche Höhe: native `<select>` ignoriert oft vertikales Padding – feste Mindesthöhe + gleiches Padding wie Inputs. */
const formControlBase =
  "box-border min-h-[44px] w-full rounded-md border border-[#d2d5d9] bg-white px-3 text-sm leading-normal text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1";

const inputClass = `${formControlBase} py-[10px]`;

const selectClass = `${formControlBase} py-[10px] appearance-none`;

/** Stabile IDs für `aria-describedby` / Fehlermeldungen (eine Checkout-Seite pro Dokument). */
const checkoutErrId = {
  email: "checkout-err-email",
  shippingFirstName: "checkout-err-shippingFirstName",
  shippingLastName: "checkout-err-shippingLastName",
  shippingLine1: "checkout-err-shippingLine1",
  shippingZip: "checkout-err-shippingZip",
  shippingCity: "checkout-err-shippingCity",
  shippingCountry: "checkout-err-shippingCountry",
  billingFirstName: "checkout-err-billingFirstName",
  billingLastName: "checkout-err-billingLastName",
  billingLine1: "checkout-err-billingLine1",
  billingZip: "checkout-err-billingZip",
  billingCity: "checkout-err-billingCity",
  billingCountry: "checkout-err-billingCountry",
  rechtlicheKenntnis: "checkout-err-rechtlicheKenntnis",
  checkoutPromotionCode: "checkout-err-promotion",
  form: "checkout-err-form",
} as const;

/** Deutsche Kurzbezeichnung + Ziel für Sprungmarke (Browser-Autofill / Fehlerliste). */
const CHECKOUT_FIELD_META: Record<string, { label: string; scrollId: string | null }> = {
  _form: { label: "Allgemein", scrollId: null },
  email: { label: "E-Mail", scrollId: "email" },
  shippingCountry: { label: "Land / Region (Lieferung)", scrollId: "shippingCountry" },
  shippingFirstName: { label: "Vorname (Lieferung)", scrollId: "shippingFirstName" },
  shippingLastName: { label: "Nachname (Lieferung)", scrollId: "shippingLastName" },
  shippingCompany: { label: "Firma (Lieferung)", scrollId: "shippingCompany" },
  shippingLine1: { label: "Straße und Hausnummer (Lieferung)", scrollId: "shippingLine1" },
  shippingLine2: { label: "Adresszusatz (Lieferung)", scrollId: "shippingLine2" },
  shippingZip: { label: "Postleitzahl (Lieferung)", scrollId: "shippingZip" },
  shippingCity: { label: "Stadt (Lieferung)", scrollId: "shippingCity" },
  billingCountry: { label: "Land / Region (Rechnung)", scrollId: "billingCountry" },
  billingFirstName: { label: "Vorname (Rechnung)", scrollId: "billingFirstName" },
  billingLastName: { label: "Nachname (Rechnung)", scrollId: "billingLastName" },
  billingCompany: { label: "Firma (Rechnung)", scrollId: "billingCompany" },
  billingLine1: { label: "Straße und Hausnummer (Rechnung)", scrollId: "billingLine1" },
  billingLine2: { label: "Adresszusatz (Rechnung)", scrollId: "billingLine2" },
  billingZip: { label: "Postleitzahl (Rechnung)", scrollId: "billingZip" },
  billingCity: { label: "Stadt (Rechnung)", scrollId: "billingCity" },
  phone: { label: "Telefon", scrollId: "phone" },
  paymentMethod: { label: "Zahlungsart", scrollId: null },
  rechtlicheKenntnis: { label: "AGB / Widerruf", scrollId: "rechtlicheKenntnis" },
  idempotencyKey: { label: "Sitzung", scrollId: null },
  checkoutPromotionCode: { label: "Rabattcode", scrollId: "checkout-section-rabatt" },
};

const CHECKOUT_ERROR_SCROLL_ORDER: string[] = [
  "email",
  "shippingCountry",
  "shippingFirstName",
  "shippingLastName",
  "shippingCompany",
  "shippingLine1",
  "shippingLine2",
  "shippingZip",
  "shippingCity",
  "phone",
  "billingCountry",
  "billingFirstName",
  "billingLastName",
  "billingCompany",
  "billingLine1",
  "billingLine2",
  "billingZip",
  "billingCity",
  "rechtlicheKenntnis",
  "checkoutPromotionCode",
];

function ariaFieldErr(err: string | undefined, describeId: string) {
  if (!err) return {};
  return { "aria-invalid": true as const, "aria-describedby": describeId };
}

export function CheckoutForm({
  idempotencyKey,
  lines,
  shippingRatesByCountry,
  freeShippingFromSubtotalGrossCents,
  initialShippingCountry,
  currency,
  allowedShippingCountries,
  payPalConfigured,
  payPalClientId,
  prefillPaypal,
}: {
  idempotencyKey: string;
  lines: CheckoutSummaryLine[];
  shippingRatesByCountry: Record<string, number>;
  freeShippingFromSubtotalGrossCents: number | null;
  initialShippingCountry: string;
  currency: string;
  allowedShippingCountries: { code: string; label: string }[];
  payPalConfigured: boolean;
  payPalClientId: string;
  prefillPaypal?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitCheckout, initial);
  const lastServerErrorSigRef = useRef<string | null>(null);
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({});
  /** Wenn PayPal Advanced Card Fields aktiv sind, ersetzen sie den klassischen Form-Submit. */
  const [payPalCardFieldsPrimary, setPayPalCardFieldsPrimary] = useState(false);
  /** Nur bei „Debit- oder Kreditkarte“ werden die Hosted Card Fields gemountet. */
  const [payPalSurface, setPayPalSurface] = useState<CheckoutPayPalMethodId>("paypal");
  const [shippingCountry, setShippingCountry] = useState(initialShippingCountry);
  const [committedPromoCode, setCommittedPromoCode] = useState("");
  const [declineAutomatic, setDeclineAutomatic] = useState(false);
  const [promoPreview, setPromoPreview] = useState<CheckoutPromotionPreview | { error: string } | null>(
    null,
  );

  const lineInputs: OrderPriceLineInput[] = useMemo(
    () =>
      lines.map((l) => ({
        quantity: l.quantity,
        priceGrossCents: l.product.priceGrossCents,
        taxRatePercent: l.product.taxRatePercent,
      })),
    [lines],
  );

  const baseTotalsFallback = useMemo(
    () =>
      computeCheckoutOrderTotalsWithDiscount({
        lines: lineInputs,
        shippingCountryCode: shippingCountry,
        shippingRatesCentsByCountry: shippingRatesByCountry,
        freeShippingFromSubtotalGrossCents,
        discountOffSubtotalCents: 0,
      }),
    [lineInputs, shippingCountry, shippingRatesByCountry, freeShippingFromSubtotalGrossCents],
  );

  useEffect(() => {
    let cancelled = false;
    void previewCheckoutPromotion({
      shippingCountry,
      promotionCode: committedPromoCode || undefined,
      declineAutomatic,
    }).then((r) => {
      if (cancelled) return;
      setPromoPreview(r);
    });
    return () => {
      cancelled = true;
    };
  }, [shippingCountry, committedPromoCode, declineAutomatic]);

  const displayTotals =
    promoPreview && !("error" in promoPreview) ? promoPreview.totals : baseTotalsFallback;

  const appliedPromotion =
    promoPreview && !("error" in promoPreview) ? promoPreview.resolved : null;
  const hasSubtotalPromotion =
    appliedPromotion?.kind === "applied" &&
    (appliedPromotion.promotionType === "order_discount" ||
      appliedPromotion.promotionType === "cheapest_item_percent");
  const discountLabel = hasSubtotalPromotion ? appliedPromotion.title : null;
  const discountDetail = hasSubtotalPromotion
    ? appliedPromotion.source === "code" && appliedPromotion.code
      ? `Code ${appliedPromotion.code}`
      : appliedPromotion.source === "automatic"
        ? "Automatisch angewendet"
        : null
    : null;
  const shippingPromotionLabel =
    appliedPromotion?.kind === "applied" && appliedPromotion.promotionType === "free_shipping"
      ? appliedPromotion.title
      : null;

  const onPayPalSurfaceChange = (id: CheckoutPayPalMethodId) => {
    setPayPalSurface(id);
    if (id !== "card") setPayPalCardFieldsPrimary(false);
  };

  useEffect(() => {
    if (!prefillPaypal) return;
    const t = window.setTimeout(() => {
      document.getElementById("checkout-section-zahlung")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [prefillPaypal]);

  const fe = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  const discountCodeMessage = fe?.checkoutPromotionCode ?? (promoPreview && !("error" in promoPreview) ? promoPreview.codeError : null);

  useEffect(() => {
    if (!state || state.ok || !("fieldErrors" in state) || !state.fieldErrors) {
      if (state?.ok) lastServerErrorSigRef.current = null;
      return;
    }
    const sig = JSON.stringify({ err: state.error, fe: state.fieldErrors });
    if (sig === lastServerErrorSigRef.current) return;
    lastServerErrorSigRef.current = sig;

    const errs = state.fieldErrors;
    let focused = false;
    for (const key of CHECKOUT_ERROR_SCROLL_ORDER) {
      if (!errs[key]) continue;
      const scrollId = CHECKOUT_FIELD_META[key]?.scrollId ?? key;
      const el = scrollId ? document.getElementById(scrollId) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
          (el as HTMLElement).focus({ preventScroll: true });
        } catch {
          (el as HTMLElement).focus();
        }
        focused = true;
        break;
      }
    }
    if (!focused) {
      for (const key of Object.keys(errs)) {
        const el = document.getElementById(key);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          try {
            (el as HTMLElement).focus({ preventScroll: true });
          } catch {
            (el as HTMLElement).focus();
          }
          break;
        }
      }
    }
  }, [state]);

  /**
   * Ohne `preventDefault` setzt React 19 nach jeder abgeschlossenen Server Action das Formular zurück
   * (auch bei `{ ok: false }`) — unkontrollierte Felder wie die E-Mail werden geleert.
   */
  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(() => {
      formAction(new FormData(e.currentTarget));
    });
  };

  const clearLive = (key: string) => {
    setLiveErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onEmailBlur = (e: FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    if (!v) {
      setLiveErrors((p) => ({ ...p, email: "" }));
      return;
    }
    const r = z.string().email().safeParse(v);
    setLiveErrors((p) => ({
      ...p,
      email: r.success ? "" : "Bitte gültige E-Mail-Adresse eingeben.",
    }));
  };

  const readCountry = (form: HTMLFormElement | null | undefined, name: "shippingCountry" | "billingCountry") => {
    const el = form?.elements.namedItem(name) as HTMLSelectElement | undefined;
    return (el?.value ?? initialShippingCountry).trim().toUpperCase();
  };

  const onShippingZipBlur = (e: FocusEvent<HTMLInputElement>) => {
    const country = readCountry(e.target.form, "shippingCountry");
    const msg = postalCodeErrorMessage(country, e.target.value);
    setLiveErrors((p) => ({ ...p, shippingZip: msg ?? "" }));
  };

  const onShippingLine1Blur = (e: FocusEvent<HTMLInputElement>) => {
    const country = readCountry(e.target.form, "shippingCountry");
    const msg = addressLine1HouseNumberMessage(country, e.target.value);
    setLiveErrors((p) => ({ ...p, shippingLine1: msg ?? "" }));
  };

  const onBillingZipBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (!billingDifferent) return;
    const country = readCountry(e.target.form, "billingCountry");
    const msg = postalCodeErrorMessage(country, e.target.value);
    setLiveErrors((p) => ({ ...p, billingZip: msg ?? "" }));
  };

  const onBillingLine1Blur = (e: FocusEvent<HTMLInputElement>) => {
    if (!billingDifferent) return;
    const country = readCountry(e.target.form, "billingCountry");
    const msg = addressLine1HouseNumberMessage(country, e.target.value);
    setLiveErrors((p) => ({ ...p, billingLine1: msg ?? "" }));
  };

  const onShippingCountryChange = () => {
    clearLive("shippingZip");
    clearLive("shippingLine1");
  };

  const onBillingCountryChange = () => {
    clearLive("billingZip");
    clearLive("billingLine1");
  };

  return (
    <form
      id={STOREFRONT_CHECKOUT_FORM_ID}
      onSubmit={onFormSubmit}
      className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start"
    >
      <div className="order-2 min-w-0 border-b border-(--surface-muted) bg-white px-4 py-10 sm:px-8 lg:order-1 lg:border-b-0 lg:pr-12 lg:pl-0">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="paymentMethod" value="paypal" />
        <h1 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">Checkout</h1>

        {state && !state.ok ? (
          <div
            id="checkout-validation-summary"
            className="mt-4 max-w-lg rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <p className="font-medium">{state.error}</p>
            {fe && Object.keys(fe).length > 0 ? (
              <div className="mt-3 border-t border-red-200/80 pt-3">
                <p className="text-xs font-medium text-red-950">Bitte prüfen:</p>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-red-900">
                  {Object.entries(fe).map(([key, message]) => {
                    const meta = CHECKOUT_FIELD_META[key];
                    const label = meta?.label ?? key;
                    const href = meta?.scrollId ? `#${meta.scrollId}` : undefined;
                    return (
                      <li key={key}>
                        {href ? (
                          <a href={href} className="font-medium text-primary underline-offset-2 hover:underline">
                            {label}
                          </a>
                        ) : (
                          <span className="font-medium">{label}</span>
                        )}
                        {": "}
                        <span className="text-red-800">{message}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
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
              className={inputClass}
              onBlur={onEmailBlur}
              onChange={() => clearLive("email")}
              {...ariaFieldErr(fe?.email ?? (liveErrors.email || undefined), checkoutErrId.email)}
            />
            {(fe?.email || liveErrors.email) && (
              <p id={checkoutErrId.email} className="mt-1 text-sm text-red-600" role="alert">
                {fe?.email ?? liveErrors.email}
              </p>
            )}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              name="newsletter"
              autoComplete="off"
              className="size-4 rounded border-[#d2d5d9]"
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
            <div>
              <label htmlFor="shippingCountry" className="mb-1 block text-sm text-[#6b7280]">
                Land / Region
              </label>
              <select
                id="shippingCountry"
                name="shippingCountry"
                autoComplete="shipping country"
                className={selectClass}
                value={shippingCountry}
                onChange={(e) => {
                  setShippingCountry(e.target.value);
                  onShippingCountryChange();
                }}
                {...ariaFieldErr(fe?.shippingCountry, checkoutErrId.shippingCountry)}
              >
                {allowedShippingCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              {fe?.shippingCountry ? (
                <p id={checkoutErrId.shippingCountry} className="mt-1 text-sm text-red-600" role="alert">
                  {fe.shippingCountry}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="shippingFirstName" className="mb-1 block text-sm text-[#6b7280]">
                  Vorname
                </label>
                <input
                  id="shippingFirstName"
                  name="shippingFirstName"
                  required
                  autoComplete="shipping given-name"
                  className={inputClass}
                  {...ariaFieldErr(fe?.shippingFirstName, checkoutErrId.shippingFirstName)}
                />
                {fe?.shippingFirstName ? (
                  <p
                    id={checkoutErrId.shippingFirstName}
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {fe.shippingFirstName}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="shippingLastName" className="mb-1 block text-sm text-[#6b7280]">
                  Nachname
                </label>
                <input
                  id="shippingLastName"
                  name="shippingLastName"
                  required
                  autoComplete="shipping family-name"
                  className={inputClass}
                  {...ariaFieldErr(fe?.shippingLastName, checkoutErrId.shippingLastName)}
                />
                {fe?.shippingLastName ? (
                  <p
                    id={checkoutErrId.shippingLastName}
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {fe.shippingLastName}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="shippingCompany" className="mb-1 block text-sm text-[#6b7280]">
                Firma (optional)
              </label>
              <input
                id="shippingCompany"
                name="shippingCompany"
                autoComplete="shipping organization"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="shippingLine1" className="mb-1 block text-sm text-[#6b7280]">
                Straße und Hausnummer
              </label>
              <input
                id="shippingLine1"
                name="shippingLine1"
                required
                autoComplete="shipping address-line1"
                placeholder="z. B. Musterstraße 12"
                className={inputClass}
                onBlur={onShippingLine1Blur}
                onChange={() => clearLive("shippingLine1")}
                {...ariaFieldErr(
                  fe?.shippingLine1 ?? (liveErrors.shippingLine1 || undefined),
                  checkoutErrId.shippingLine1,
                )}
              />
              {(fe?.shippingLine1 || liveErrors.shippingLine1) && (
                <p id={checkoutErrId.shippingLine1} className="mt-1 text-sm text-red-600" role="alert">
                  {fe?.shippingLine1 ?? liveErrors.shippingLine1}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="shippingLine2" className="mb-1 block text-sm text-[#6b7280]">
                Wohnung, Zimmer, usw. (optional)
              </label>
              <input
                id="shippingLine2"
                name="shippingLine2"
                autoComplete="shipping address-line2"
                className={inputClass}
              />
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
                  inputMode="text"
                  autoComplete="shipping postal-code"
                  className={inputClass}
                  onBlur={onShippingZipBlur}
                  onChange={() => clearLive("shippingZip")}
                  {...ariaFieldErr(
                    fe?.shippingZip ?? (liveErrors.shippingZip || undefined),
                    checkoutErrId.shippingZip,
                  )}
                />
                {(fe?.shippingZip || liveErrors.shippingZip) && (
                  <p id={checkoutErrId.shippingZip} className="mt-1 text-sm text-red-600" role="alert">
                    {fe?.shippingZip ?? liveErrors.shippingZip}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="shippingCity" className="mb-1 block text-sm text-[#6b7280]">
                  Stadt
                </label>
                <input
                  id="shippingCity"
                  name="shippingCity"
                  required
                  autoComplete="shipping address-level2"
                  className={inputClass}
                  {...ariaFieldErr(fe?.shippingCity, checkoutErrId.shippingCity)}
                />
                {fe?.shippingCity ? (
                  <p id={checkoutErrId.shippingCity} className="mt-1 text-sm text-red-600" role="alert">
                    {fe.shippingCity}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm text-[#6b7280]"
                title="Optional. Für Rückfragen zur Lieferung."
              >
                Telefon (optional)
              </label>
              <p id="checkout-phone-hint" className="sr-only">
                Optional. Für Rückfragen zur Lieferung.
              </p>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="shipping tel"
                className={inputClass}
                aria-describedby="checkout-phone-hint"
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
                <select
                  id="billingCountry"
                  name="billingCountry"
                  autoComplete="billing country"
                  className={selectClass}
                  defaultValue={initialShippingCountry}
                  onChange={onBillingCountryChange}
                  {...ariaFieldErr(fe?.billingCountry, checkoutErrId.billingCountry)}
                >
                  {allowedShippingCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {fe?.billingCountry ? (
                  <p id={checkoutErrId.billingCountry} className="mt-1 text-sm text-red-600" role="alert">
                    {fe.billingCountry}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingFirstName" className="mb-1 block text-sm text-[#6b7280]">
                    Vorname
                  </label>
                  <input
                    id="billingFirstName"
                    name="billingFirstName"
                    autoComplete="billing given-name"
                    className={inputClass}
                    {...ariaFieldErr(fe?.billingFirstName, checkoutErrId.billingFirstName)}
                  />
                  {fe?.billingFirstName ? (
                    <p
                      id={checkoutErrId.billingFirstName}
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {fe.billingFirstName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="billingLastName" className="mb-1 block text-sm text-[#6b7280]">
                    Nachname
                  </label>
                  <input
                    id="billingLastName"
                    name="billingLastName"
                    autoComplete="billing family-name"
                    className={inputClass}
                    {...ariaFieldErr(fe?.billingLastName, checkoutErrId.billingLastName)}
                  />
                  {fe?.billingLastName ? (
                    <p
                      id={checkoutErrId.billingLastName}
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {fe.billingLastName}
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <label htmlFor="billingCompany" className="mb-1 block text-sm text-[#6b7280]">
                  Firma (optional)
                </label>
                <input
                  id="billingCompany"
                  name="billingCompany"
                  autoComplete="billing organization"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="billingLine1" className="mb-1 block text-sm text-[#6b7280]">
                  Straße und Hausnummer
                </label>
                <input
                  id="billingLine1"
                  name="billingLine1"
                  autoComplete="billing address-line1"
                  placeholder="z. B. Musterstraße 12"
                  className={inputClass}
                  onBlur={onBillingLine1Blur}
                  onChange={() => clearLive("billingLine1")}
                  {...ariaFieldErr(
                    fe?.billingLine1 ?? (liveErrors.billingLine1 || undefined),
                    checkoutErrId.billingLine1,
                  )}
                />
                {(fe?.billingLine1 || liveErrors.billingLine1) && (
                  <p id={checkoutErrId.billingLine1} className="mt-1 text-sm text-red-600" role="alert">
                    {fe?.billingLine1 ?? liveErrors.billingLine1}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="billingLine2" className="mb-1 block text-sm text-[#6b7280]">
                  Adresszusatz (optional)
                </label>
                <input
                  id="billingLine2"
                  name="billingLine2"
                  autoComplete="billing address-line2"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billingZip" className="mb-1 block text-sm text-[#6b7280]">
                    Postleitzahl
                  </label>
                  <input
                    id="billingZip"
                    name="billingZip"
                    inputMode="text"
                    autoComplete="billing postal-code"
                    className={inputClass}
                    onBlur={onBillingZipBlur}
                    onChange={() => clearLive("billingZip")}
                    {...ariaFieldErr(
                      fe?.billingZip ?? (liveErrors.billingZip || undefined),
                      checkoutErrId.billingZip,
                    )}
                  />
                  {(fe?.billingZip || liveErrors.billingZip) && (
                    <p id={checkoutErrId.billingZip} className="mt-1 text-sm text-red-600" role="alert">
                      {fe?.billingZip ?? liveErrors.billingZip}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="billingCity" className="mb-1 block text-sm text-[#6b7280]">
                    Stadt
                  </label>
                  <input
                    id="billingCity"
                    name="billingCity"
                    autoComplete="billing address-level2"
                    className={inputClass}
                    {...ariaFieldErr(fe?.billingCity, checkoutErrId.billingCity)}
                  />
                  {fe?.billingCity ? (
                    <p id={checkoutErrId.billingCity} className="mt-1 text-sm text-red-600" role="alert">
                      {fe.billingCity}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section id="checkout-section-zahlung" className="mt-12 scroll-mt-24">
          <h2 className="text-lg font-semibold text-[#1f2937]">Zahlung</h2>
          {payPalConfigured ? (
            <>
              <CheckoutPaymentMethods value={payPalSurface} onChange={onPayPalSurfaceChange} />
              {payPalSurface === "card" ? (
                <PayPalCardFieldsCheckout
                  formId={STOREFRONT_CHECKOUT_FORM_ID}
                  paypalClientId={payPalClientId}
                  currency={currency}
                  onEligibleChange={setPayPalCardFieldsPrimary}
                />
              ) : null}
            </>
          ) : null}
        </section>

        {(!payPalConfigured || payPalSurface !== "card" || !payPalCardFieldsPrimary) && (
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="mt-8 w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50 lg:max-w-md"
          >
            {pending ? "Wird gesendet…" : "Jetzt kostenpflichtig bestellen"}
          </button>
        )}

        <div className="mt-8 max-w-md">
          <label
            htmlFor="rechtlicheKenntnis"
            className="flex cursor-pointer items-start gap-2 text-left text-xs leading-snug text-[#6b7280]"
          >
            <input
              id="rechtlicheKenntnis"
              type="checkbox"
              name="rechtlicheKenntnis"
              value="on"
              required
              autoComplete="off"
              className="mt-0.5 size-3.5 shrink-0 rounded border-[#d2d5d9] text-primary"
              {...ariaFieldErr(fe?.rechtlicheKenntnis, checkoutErrId.rechtlicheKenntnis)}
            />
            <span>
              Ich habe die{" "}
              <Link href="/agb" className="text-primary underline-offset-2 hover:underline">
                AGB
              </Link>{" "}
              und die{" "}
              <Link href="/widerruf" className="text-primary underline-offset-2 hover:underline">
                Widerrufsbelehrung
              </Link>{" "}
              zur Kenntnis genommen.
            </span>
          </label>
          {fe?.rechtlicheKenntnis ? (
            <p id={checkoutErrId.rechtlicheKenntnis} className="mt-1.5 text-xs text-red-600" role="alert">
              {fe.rechtlicheKenntnis}
            </p>
          ) : null}
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#6b7280] underline-offset-2">
          <Link href="/widerruf" className="text-primary hover:text-(--primary-hover) hover:underline">
            Widerrufsrecht
          </Link>
          <Link href="/rueckgabe" className="text-primary hover:text-(--primary-hover) hover:underline">
            Rückgabe
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
        shippingCents={displayTotals.shippingCents}
        taxAmountCents={displayTotals.taxAmountCents}
        totalCents={displayTotals.totalCents}
        vatApplies={displayTotals.vatApplies}
        currency={currency}
        catalogSubtotalBeforeDiscountCents={displayTotals.catalogSubtotalBeforeDiscountCents}
        discountOffSubtotalCents={displayTotals.discountOffSubtotalCents}
        discountLabel={discountLabel}
        discountDetail={discountDetail}
        shippingSavedByPromotionCents={displayTotals.shippingSavedByPromotionCents}
        shippingPromotionLabel={shippingPromotionLabel}
      >
        <div id="checkout-section-rabatt">
          <CheckoutDiscountPanel
            committedCode={committedPromoCode}
            setCommittedCode={setCommittedPromoCode}
            declineAutomatic={declineAutomatic}
            setDeclineAutomatic={setDeclineAutomatic}
            previewLoading={promoPreview === null}
            codeError={discountCodeMessage}
          />
          <AutomaticPromotionDismiss
            visible={
              appliedPromotion?.kind === "applied" &&
              appliedPromotion.source === "automatic" &&
              committedPromoCode.length === 0
            }
            onDismiss={() => setDeclineAutomatic(true)}
          />
        </div>
      </CheckoutSummaryAside>
    </form>
  );
}
