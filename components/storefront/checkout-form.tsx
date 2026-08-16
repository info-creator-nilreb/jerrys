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
  submitWorkshopCheckout,
} from "@/app/(storefront)/checkout/termine/actions";
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
  isCheckoutPayPalMethodVisible,
  type CheckoutPayPalMethodId,
} from "@/components/storefront/checkout-payment-methods";
import {
  PayPalCardFieldsCheckout,
  type PayPalCardFieldsSubmitRef,
} from "@/components/storefront/paypal-card-fields-checkout";
import { SmartAddressFields } from "@/components/storefront/smart-address-fields";
import { CheckoutDeliveryMethodToggle } from "@/components/storefront/checkout-delivery-method-toggle";
import { CheckoutPageExpress } from "@/components/storefront/checkout-page-express";
import {
  CheckoutRegularWallets,
  type CheckoutWalletReady,
  type CheckoutWalletStartRef,
} from "@/components/storefront/checkout-regular-wallets";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";
import type { CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import { CHECKOUT_FORM_COLUMN_CLASS } from "@/lib/checkout/checkout-form-layout";
import { isCheckoutWalletMethod } from "@/lib/checkout/checkout-payment-hints";
import {
  checkoutFormDraftFromForm,
  loadCheckoutFormDraft,
  mergeCheckoutFormDraft,
  saveCheckoutFormDraft,
  type CheckoutFormDraft,
} from "@/lib/checkout/checkout-form-draft";
import { saveCheckoutPromoPreference } from "@/lib/checkout/checkout-promo-preference";
import { openStorefrontLogin } from "@/lib/storefront/open-login-event";
import type { OrderPriceLineInput } from "@/lib/tax/order-price-totals";
import type {
  CheckoutAddressPrefill,
  CustomerAddressListItem,
} from "@/features/customers/checkout-prefill";
import type { PayPalVaultedCard } from "@/lib/payments/paypal-vaulted-cards";
import { z } from "zod";

const initial: CheckoutActionState = null;

/** Formular-ID für Tests / Erweiterungen. */
export const STOREFRONT_CHECKOUT_FORM_ID = "storefront-checkout-form";

/** Einheitliche Höhe: native `<select>` ignoriert oft vertikales Padding – feste Mindesthöhe + gleiches Padding wie Inputs. */
const formControlBase =
  "box-border min-h-[44px] w-full rounded-md border border-[#d2d5d9] bg-white px-3 text-sm leading-normal text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1";

const inputClass = `${formControlBase} py-[10px]`;

const selectClass = `${formControlBase} py-[10px] appearance-none`;

const checkoutLabelClass = "mb-1 block text-sm text-[#6b7280]";

/** Wert im Adress-Auswahlfeld für „neue Adresse eingeben“. */
const NEW_ADDRESS_OPTION = "";

/** Einzeiler für das Auswahlfeld: Bezeichnung, Name und Ort reichen zum Unterscheiden. */
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
  deliveryMethod: { label: "Lieferart", scrollId: null },
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
  payPalLive = false,
  prefillPaypal,
  restoreFormDraft = true,
  addressPrefill,
  savedAddresses = [],
  canSaveAddressToAccount = false,
  showContactLogin = true,
  workshopBookingId,
  hidePromotionPanel = false,
  checkoutTitle = "Checkout",
  paypalUserIdToken = null,
  paypalVaultedCards = [],
  sepaAvailable = false,
  applePayStoreLabel,
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
  /** Live-PayPal: Google Pay PRODUCTION, sonst TEST. */
  payPalLive?: boolean;
  prefillPaypal?: boolean;
  /** Formulardaten nach PayPal-Abbruch, Browser-Zurück und Reload wiederherstellen. */
  restoreFormDraft?: boolean;
  addressPrefill?: CheckoutAddressPrefill | null;
  /** Adressbuch des angemeldeten, verifizierten Kunden (leer für Gäste). */
  savedAddresses?: CustomerAddressListItem[];
  canSaveAddressToAccount?: boolean;
  /** false = Kunde ist bereits angemeldet; kein totes „Anmelden“-Chrome. */
  showContactLogin?: boolean;
  /** Gesetzt bei /checkout/termine — bindet Workshop-Server-Action direkt (kein Prop an useActionState). */
  workshopBookingId?: string;
  hidePromotionPanel?: boolean;
  checkoutTitle?: string;
  paypalUserIdToken?: string | null;
  paypalVaultedCards?: PayPalVaultedCard[];
  /** SEPA-Lastschrift nur listen, wenn PayPal APM beim Händler aktiv ist. */
  sepaAvailable?: boolean;
  /** Apple Pay Händlerlabel (aus ShopSettings, ASCII). */
  applePayStoreLabel: string;
}) {
  const [cartState, cartFormAction, cartPending] = useActionState(submitCheckout, initial);
  const [workshopState, workshopFormAction, workshopPending] = useActionState(
    submitWorkshopCheckout,
    null,
  );

  const state = workshopBookingId ? workshopState : cartState;
  const formAction = workshopBookingId ? workshopFormAction : cartFormAction;
  const pending = workshopBookingId ? workshopPending : cartPending;

  const prefillCountry =
    addressPrefill?.shippingCountry &&
    allowedShippingCountries.some((c) => c.code === addressPrefill.shippingCountry)
      ? addressPrefill.shippingCountry
      : initialShippingCountry;

  const lastServerErrorSigRef = useRef<string | null>(null);
  const [billingDifferent, setBillingDifferent] = useState(
    addressPrefill?.billingUseShipping === "no",
  );
  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({});
  /** Wenn PayPal Advanced Card Fields aktiv sind, löst der Bestellbutton deren Submit aus. */
  const [payPalCardFieldsPrimary, setPayPalCardFieldsPrimary] = useState(false);
  const [cardPayBusy, setCardPayBusy] = useState(false);
  const cardFieldsSubmitRef = useRef<PayPalCardFieldsSubmitRef["current"]>(null);
  const walletStartRef = useRef<CheckoutWalletStartRef>({
    startApplePay: null,
    startGooglePay: null,
  });
  const [walletReady, setWalletReady] = useState<CheckoutWalletReady>({
    applePay: false,
    googlePay: false,
  });
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  /** Nur bei „Debit- oder Kreditkarte“ werden die Hosted Card Fields gemountet. */
  const [payPalSurface, setPayPalSurface] = useState<CheckoutPayPalMethodId>("paypal");
  const [email, setEmail] = useState(addressPrefill?.email ?? "");
  const [phone, setPhone] = useState("");
  const [shippingCountry, setShippingCountry] = useState(prefillCountry);
  const [deliveryMethod, setDeliveryMethod] = useState<CheckoutDeliveryMethod>("shipping");
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

  /** Startauswahl = Standardadresse, aus der auch das Prefill stammt. */
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

  /** Adressfelder sind in `SmartAddressFields` gekapselt — Auswahl remountet sie über `key`. */
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

  const [committedPromoCode, setCommittedPromoCode] = useState("");
  const [declineAutomatic, setDeclineAutomatic] = useState(false);
  const [rechtlicheKenntnis, setRechtlicheKenntnis] = useState(false);
  const [addressFieldsEpoch, setAddressFieldsEpoch] = useState(0);
  const [promoPreview, setPromoPreview] = useState<CheckoutPromotionPreview | { error: string } | null>(
    null,
  );
  const draftRestoredRef = useRef(false);
  const draftHydratedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const applyCheckoutFormDraft = (draft: CheckoutFormDraft) => {
    setEmail(draft.email);
    setPhone(draft.phone);
    setDeliveryMethod(draft.deliveryMethod);
    if (allowedShippingCountries.some((c) => c.code === draft.shippingCountry)) {
      setShippingCountry(draft.shippingCountry);
    }
    setShippingPerson(draft.shippingPerson);
    setShippingAddressValues(draft.shippingAddressValues);
    setShippingAddressId(draft.shippingAddressId);
    setBillingDifferent(draft.billingDifferent);
    if (allowedShippingCountries.some((c) => c.code === draft.billingCountry)) {
      setBillingCountry(draft.billingCountry);
    }
    setBillingPerson(draft.billingPerson);
    setBillingAddressValues(draft.billingAddressValues);
    setBillingAddressId(draft.billingAddressId);
    setPayPalSurface(draft.payPalSurface);
    setCommittedPromoCode(draft.committedPromoCode);
    setDeclineAutomatic(draft.declineAutomatic);
    setRechtlicheKenntnis(draft.rechtlicheKenntnis);
    setAddressFieldsEpoch((n) => n + 1);
  };

  useEffect(() => {
    if (!restoreFormDraft || workshopBookingId) {
      draftHydratedRef.current = true;
      return;
    }
    const draft = loadCheckoutFormDraft();
    if (draft) {
      draftRestoredRef.current = true;
      applyCheckoutFormDraft(draft);
    }
    draftHydratedRef.current = true;
    // Nur beim ersten Mount wiederherstellen — Draft bleibt bis erfolgreicher Bestellung.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount restore
  }, [restoreFormDraft, workshopBookingId]);

  useEffect(() => {
    if (workshopBookingId || !restoreFormDraft) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted && draftRestoredRef.current) return;
      const draft = loadCheckoutFormDraft();
      if (!draft) return;
      draftRestoredRef.current = true;
      draftHydratedRef.current = true;
      applyCheckoutFormDraft(draft);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bfcache restore
  }, [restoreFormDraft, workshopBookingId]);

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
        deliveryMethod,
      }),
    [lineInputs, shippingCountry, shippingRatesByCountry, freeShippingFromSubtotalGrossCents, deliveryMethod],
  );

  useEffect(() => {
    if (hidePromotionPanel) {
      return;
    }
    let cancelled = false;
    void previewCheckoutPromotion({
      shippingCountry,
      promotionCode: committedPromoCode || undefined,
      declineAutomatic,
      deliveryMethod,
    }).then((r) => {
      if (cancelled) return;
      setPromoPreview(r);
    });
    return () => {
      cancelled = true;
    };
  }, [shippingCountry, committedPromoCode, declineAutomatic, hidePromotionPanel, deliveryMethod]);

  useEffect(() => {
    if (workshopBookingId || hidePromotionPanel) return;
    saveCheckoutPromoPreference({
      code: committedPromoCode,
      declineAutomatic,
    });
  }, [committedPromoCode, declineAutomatic, hidePromotionPanel, workshopBookingId]);

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

  const onPayPalSurfaceChange = (id: CheckoutPayPalMethodId) => {
    setPayPalSurface(id);
    setWalletError(null);
    if (id !== "card") {
      setPayPalCardFieldsPrimary(false);
      setCardPayBusy(false);
    }
  };

  useEffect(() => {
    const visible = isCheckoutPayPalMethodVisible(payPalSurface, {
      nativeWallets: !workshopBookingId,
      applePayReady: walletReady.applePay,
      googlePayReady: walletReady.googlePay,
      sepaAvailable,
    });
    if (!visible) setPayPalSurface("paypal");
  }, [
    payPalSurface,
    sepaAvailable,
    walletReady.applePay,
    walletReady.googlePay,
    workshopBookingId,
  ]);

  useEffect(() => {
    if (!prefillPaypal) return;
    const t = window.setTimeout(() => {
      document.getElementById("checkout-section-zahlung")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [prefillPaypal]);

  /** Termin-Checkout: kein `redirect()` in der Server Action (React #441) — Navigation clientseitig. */
  useEffect(() => {
    if (!workshopBookingId || !state?.ok) return;
    const url =
      "paymentRedirectUrl" in state && typeof state.paymentRedirectUrl === "string"
        ? state.paymentRedirectUrl.trim()
        : "";
    if (!url) return;
    window.location.assign(url);
  }, [state, workshopBookingId]);

  const fe = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  const discountCodeMessage =
    fe?.checkoutPromotionCode ??
    (promoPreview && !("error" in promoPreview) ? promoPreview.codeError : null);
  const promoSystemError =
    promoPreview && "error" in promoPreview ? promoPreview.error : null;
  const shippingCountryLabel =
    allowedShippingCountries.find((c) => c.code === shippingCountry)?.label ?? shippingCountry;

  const legalConsentBlock = (
    <div id="checkout-section-rechtliches" className="mt-8 scroll-mt-24">
      <label
        htmlFor="rechtlicheKenntnis"
        className="flex min-h-11 cursor-pointer items-start gap-3 text-left text-sm leading-snug text-[#6b7280]"
      >
        <input
          id="rechtlicheKenntnis"
          type="checkbox"
          name="rechtlicheKenntnis"
          value="on"
          required
          checked={rechtlicheKenntnis}
          onChange={(e) => setRechtlicheKenntnis(e.target.checked)}
          autoComplete="off"
          className="mt-1 size-4 shrink-0 checkbox-primary"
          {...ariaFieldErr(fe?.rechtlicheKenntnis, checkoutErrId.rechtlicheKenntnis)}
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
          zur Kenntnis genommen. Die Versandkosten sind in der Bestellübersicht vor der Zahlung
          ausgewiesen.
        </span>
      </label>
      {fe?.rechtlicheKenntnis ? (
        <p id={checkoutErrId.rechtlicheKenntnis} className="mt-1.5 text-xs text-red-600" role="alert">
          {fe.rechtlicheKenntnis}
        </p>
      ) : null}
    </div>
  );

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

  const persistCheckoutFormDraft = () => {
    if (workshopBookingId || !draftHydratedRef.current) return;
    const fromState = buildCheckoutFormDraftFromState();
    const form = formRef.current;
    if (!form) {
      saveCheckoutFormDraft(fromState);
      return;
    }
    saveCheckoutFormDraft(
      mergeCheckoutFormDraft(
        checkoutFormDraftFromForm(form, {
          deliveryMethod,
          shippingAddressId,
          billingDifferent,
          billingAddressId,
          payPalSurface,
          committedPromoCode,
          declineAutomatic,
        }),
        fromState,
      ),
    );
  };

  const persistDraftRef = useRef(persistCheckoutFormDraft);
  persistDraftRef.current = persistCheckoutFormDraft;

  useEffect(() => {
    if (workshopBookingId) return;
    const form = formRef.current;
    if (!form) return;
    let timer: number | null = null;
    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => persistDraftRef.current(), 400);
    };
    form.addEventListener("input", schedule);
    form.addEventListener("change", schedule);
    return () => {
      if (timer) window.clearTimeout(timer);
      form.removeEventListener("input", schedule);
      form.removeEventListener("change", schedule);
    };
    // Re-bind after address remount so new uncontrolled fields are included.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addressFieldsEpoch,
    workshopBookingId,
    deliveryMethod,
    shippingAddressId,
    billingDifferent,
    billingAddressId,
    payPalSurface,
    committedPromoCode,
    declineAutomatic,
  ]);

  useEffect(() => {
    if (workshopBookingId) return;
    const persist = () => persistDraftRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [workshopBookingId]);
  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (workshopBookingId) return;
    e.preventDefault();
    const form = e.currentTarget;
    persistCheckoutFormDraft();
    if (isCheckoutWalletMethod(payPalSurface)) {
      if (payPalSurface === "apple_pay") {
        if (!walletReady.applePay || !walletStartRef.current.startApplePay) {
          setWalletError(
            "Apple Pay ist auf diesem Gerät nicht verfügbar. Bitte Safari auf einem Apple-Gerät nutzen oder eine andere Zahlungsart wählen.",
          );
          return;
        }
        walletStartRef.current.startApplePay(form);
        return;
      }
      if (!walletReady.googlePay || !walletStartRef.current.startGooglePay) {
        setWalletError(
          "Google Pay ist auf diesem Gerät nicht verfügbar. Bitte eine andere Zahlungsart wählen.",
        );
        return;
      }
      void walletStartRef.current.startGooglePay(form);
      return;
    }
    startTransition(() => {
      formAction(new FormData(form));
    });
  };

  function buildCheckoutFormDraftFromState(): CheckoutFormDraft {
    return {
      v: 1,
      email,
      phone,
      deliveryMethod,
      shippingCountry,
      shippingPerson,
      shippingAddressValues,
      shippingAddressId,
      billingDifferent,
      billingCountry,
      billingPerson,
      billingAddressValues,
      billingAddressId,
      payPalSurface,
      committedPromoCode,
      declineAutomatic,
      rechtlicheKenntnis,
    };
  }

  const workshopMpa = Boolean(workshopBookingId);
  const useCardPayButton =
    payPalConfigured && !workshopMpa && payPalSurface === "card" && payPalCardFieldsPrimary;
  const walletMethod = isCheckoutWalletMethod(payPalSurface);
  const walletBlocked =
    (payPalSurface === "apple_pay" && !walletReady.applePay) ||
    (payPalSurface === "google_pay" && !walletReady.googlePay);
  const submitBusy = workshopMpa ? false : useCardPayButton ? cardPayBusy : walletMethod ? walletBusy : pending;

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

  return (
    <form
      id={STOREFRONT_CHECKOUT_FORM_ID}
      ref={formRef}
      action={workshopMpa ? "/api/workshop/complete-checkout" : undefined}
      method={workshopMpa ? "post" : undefined}
      onSubmit={workshopMpa ? undefined : onFormSubmit}
      className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch"
    >
      <div className="order-2 min-w-0 border-b border-(--surface-muted) bg-white px-4 py-10 sm:px-8 lg:order-1 lg:flex lg:justify-end lg:border-b-0 lg:py-12 lg:pr-10 xl:pr-16">
        <div className={CHECKOUT_FORM_COLUMN_CLASS}>
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        {workshopBookingId ? (
          <input type="hidden" name="workshopBookingId" value={workshopBookingId} />
        ) : null}
        <input type="hidden" name="paymentMethod" value="paypal" />
        <h1 className="text-xl font-semibold text-[#1f2937] sm:text-2xl">{checkoutTitle}</h1>

        {!workshopMpa ? (
          <CheckoutPageExpress
            payPalConfigured={payPalConfigured}
            paypalClientId={payPalClientId}
            currency={currency}
            totalGrossCents={displayTotals.totalCents}
            applePayStoreLabel={applePayStoreLabel}
            promotionCode={committedPromoCode}
            declineAutomatic={declineAutomatic}
            deliveryMethod={deliveryMethod}
          />
        ) : null}

        {state && !state.ok ? (
          <div
            id="checkout-validation-summary"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
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
            {showContactLogin ? (
              <button
                type="button"
                onClick={() => openStorefrontLogin()}
                className="text-sm font-medium text-primary underline-offset-2 hover:text-(--primary-hover) hover:underline"
              >
                Anmelden
              </button>
            ) : null}
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
              placeholder="E-Mail-Adresse"
              className={inputClass}
              value={email}
              onBlur={onEmailBlur}
              onChange={(e) => {
                setEmail(e.target.value);
                clearLive("email");
              }}
              {...ariaFieldErr(fe?.email ?? (liveErrors.email || undefined), checkoutErrId.email)}
            />
            {(fe?.email || liveErrors.email) && (
              <p id={checkoutErrId.email} className="mt-1 text-sm text-red-600" role="alert">
                {fe?.email ?? liveErrors.email}
              </p>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-[#1f2937]">Lieferung</h2>
          <CheckoutDeliveryMethodToggle value={deliveryMethod} onChange={setDeliveryMethod} />

          <div className="mt-8 space-y-4">
            {savedShippingAddresses.length > 0 ? (
              <div>
                <label htmlFor="shippingSavedAddress" className={checkoutLabelClass}>
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
              <label htmlFor="shippingCountry" className="mb-1 block text-sm text-[#6b7280]">
                Land / Region
              </label>
              <select
                id="shippingCountry"
                name="shippingCountry"
                autoComplete="shipping country"
                className={selectClass}
                value={shippingCountry}
                onChange={(e) => setShippingCountry(e.target.value)}
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
                  value={shippingPerson.firstName}
                  onChange={(e) =>
                    setShippingPerson((prev) => ({ ...prev, firstName: e.target.value }))
                  }
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
                  value={shippingPerson.lastName}
                  onChange={(e) =>
                    setShippingPerson((prev) => ({ ...prev, lastName: e.target.value }))
                  }
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
                value={shippingPerson.company}
                onChange={(e) =>
                  setShippingPerson((prev) => ({ ...prev, company: e.target.value }))
                }
              />
            </div>
            <SmartAddressFields
              key={`shipping-${shippingAddressId || "neu"}-${addressFieldsEpoch}`}
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
              onValuesChange={setShippingAddressValues}
              serverErrors={{
                zip: fe?.shippingZip,
                city: fe?.shippingCity,
                line1: fe?.shippingLine1,
              }}
              errorIds={{
                zip: checkoutErrId.shippingZip,
                city: checkoutErrId.shippingCity,
                line1: checkoutErrId.shippingLine1,
              }}
              required
              autoCompleteScope="shipping"
              inputClass={inputClass}
              labelClass={checkoutLabelClass}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                className="mt-0.5 size-4 checkbox-primary"
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
              {savedBillingAddresses.length > 0 ? (
                <div>
                  <label htmlFor="billingSavedAddress" className={checkoutLabelClass}>
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
                <label htmlFor="billingCountry" className="mb-1 block text-sm text-[#6b7280]">
                  Land / Region (Rechnung)
                </label>
                <select
                  id="billingCountry"
                  name="billingCountry"
                  autoComplete="billing country"
                  className={selectClass}
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value)}
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
                    value={billingPerson.firstName}
                    onChange={(e) =>
                      setBillingPerson((prev) => ({ ...prev, firstName: e.target.value }))
                    }
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
                    value={billingPerson.lastName}
                    onChange={(e) =>
                      setBillingPerson((prev) => ({ ...prev, lastName: e.target.value }))
                    }
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
                  value={billingPerson.company}
                  onChange={(e) =>
                    setBillingPerson((prev) => ({ ...prev, company: e.target.value }))
                  }
                />
              </div>
              <SmartAddressFields
                key={`billing-${billingAddressId || "neu"}-${addressFieldsEpoch}`}
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
                onValuesChange={setBillingAddressValues}
                serverErrors={{
                  zip: fe?.billingZip,
                  city: fe?.billingCity,
                  line1: fe?.billingLine1,
                }}
                errorIds={{
                  zip: checkoutErrId.billingZip,
                  city: checkoutErrId.billingCity,
                  line1: checkoutErrId.billingLine1,
                }}
                autoCompleteScope="billing"
                inputClass={inputClass}
                labelClass={checkoutLabelClass}
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
          {payPalConfigured && !(workshopMpa && displayTotals.totalCents === 0) ? (
            <CheckoutPaymentMethods
              value={payPalSurface}
              onChange={onPayPalSurfaceChange}
              submitLabel={
                workshopMpa
                  ? displayTotals.totalCents === 0
                    ? "Jetzt verbindlich buchen"
                    : "Weiter zur Zahlung"
                  : undefined
              }
              cardInline={!workshopMpa}
              nativeWallets={!workshopMpa}
              applePayReady={walletReady.applePay}
              googlePayReady={walletReady.googlePay}
              sepaAvailable={sepaAvailable}
              cardFields={
                payPalConfigured && !workshopMpa ? (
                  <PayPalCardFieldsCheckout
                    formId={STOREFRONT_CHECKOUT_FORM_ID}
                    paypalClientId={payPalClientId}
                    currency={currency}
                    hidePayButton
                    nested
                    submitRef={cardFieldsSubmitRef}
                    onEligibleChange={setPayPalCardFieldsPrimary}
                    onBusyChange={setCardPayBusy}
                    userIdToken={paypalUserIdToken}
                    vaultedCards={paypalVaultedCards}
                    customerLoggedIn={canSaveAddressToAccount}
                  />
                ) : null
              }
            />
          ) : workshopMpa && displayTotals.totalCents === 0 ? (
            <p className="mt-2 text-sm text-[#6b7280]">Kostenlos — keine Zahlung nötig.</p>
          ) : null}
          {payPalConfigured && !workshopMpa ? (
            <CheckoutRegularWallets
              paypalClientId={payPalClientId}
              currency={currency}
              payPalLive={payPalLive}
              totalGrossCents={displayTotals.totalCents}
              applePayStoreLabel={applePayStoreLabel}
              startRef={walletStartRef.current}
              onReadyChange={setWalletReady}
              onBusyChange={setWalletBusy}
              onError={setWalletError}
            />
          ) : null}
          {walletError ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {walletError}
            </p>
          ) : null}
        </section>

        {legalConsentBlock}

        <button
          type={useCardPayButton ? "button" : "submit"}
          disabled={workshopMpa ? false : submitBusy || walletBlocked}
          aria-busy={workshopMpa ? undefined : submitBusy || undefined}
          onClick={
            useCardPayButton
              ? () => {
                  persistCheckoutFormDraft();
                  void cardFieldsSubmitRef.current?.();
                }
              : undefined
          }
          className="mt-8 w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50"
        >
          {workshopMpa
            ? displayTotals.totalCents === 0
              ? "Jetzt verbindlich buchen"
              : "Weiter zur Zahlung"
            : useCardPayButton && cardPayBusy
              ? "Wird verarbeitet…"
              : submitBusy
                ? "Wird gesendet…"
                : "Jetzt kostenpflichtig bestellen"}
        </button>

        <nav
          aria-label="Rechtliche Informationen"
          className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-sm text-[#6b7280] underline-offset-2"
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
        shippingCountryLabel={deliveryMethod === "pickup" ? null : shippingCountryLabel}
        freeShippingFromSubtotalGrossCents={freeShippingFromSubtotalGrossCents}
        deliveryMethod={deliveryMethod}
      >
        <div id="checkout-section-rabatt">
          {!hidePromotionPanel ? (
            <>
              <CheckoutDiscountPanel
                committedCode={committedPromoCode}
                setCommittedCode={setCommittedPromoCode}
                declineAutomatic={declineAutomatic}
                setDeclineAutomatic={setDeclineAutomatic}
                previewLoading={promoPreview === null}
                codeError={discountCodeMessage}
                systemError={promoSystemError}
              />
              <AutomaticPromotionDismiss
                visible={
                  appliedPromotion?.kind === "applied" &&
                  appliedPromotion.source === "automatic" &&
                  committedPromoCode.length === 0
                }
                onDismiss={() => setDeclineAutomatic(true)}
              />
            </>
          ) : null}
        </div>
      </CheckoutSummaryAside>
    </form>
  );
}
