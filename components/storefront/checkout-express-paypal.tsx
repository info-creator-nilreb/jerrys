"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isPayPalApplePayConfigEligible,
  paypalExpressSdkSrc,
} from "@/lib/payments/paypal-express-sdk";

type PayPalButtonsInstance = {
  isEligible?: () => boolean;
  render: (target: HTMLElement) => Promise<void>;
  close?: () => void;
};

type PayPalApplePayConfig = {
  isEligible?: boolean;
  countryCode?: string;
  merchantCapabilities?: string[];
  supportedNetworks?: string[];
};

type PayPalApplePaySession = {
  config: () => Promise<PayPalApplePayConfig>;
  validateMerchant: (options: {
    validationUrl: string;
    displayName?: string;
    domainName?: string;
  }) => Promise<{ merchantSession: unknown }>;
  confirmOrder: (options: {
    orderId: string;
    token: unknown;
    billingContact?: unknown;
    shippingContact?: unknown;
  }) => Promise<unknown>;
};

type PayPalExpressSdk = {
  FUNDING?: { PAYPAL?: string; APPLEPAY?: string };
  Buttons?: (options: Record<string, unknown>) => PayPalButtonsInstance;
  Applepay?: () => PayPalApplePaySession;
};

type ApplePaySessionInstance = {
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
  onpaymentmethodselected: ((event: unknown) => void) | null;
  onshippingcontactselected: ((event: unknown) => void) | null;
  onshippingmethodselected: ((event: unknown) => void) | null;
  onpaymentauthorized:
    | ((event: { payment: { token: unknown; billingContact?: unknown; shippingContact?: unknown } }) => void)
    | null;
  oncancel: (() => void) | null;
  completeMerchantValidation: (merchantSession: unknown) => void;
  completePaymentMethodSelection: (update: Record<string, unknown>) => void;
  completeShippingContactSelection: (update: Record<string, unknown>) => void;
  completeShippingMethodSelection: (update: Record<string, unknown>) => void;
  completePayment: (result: unknown) => void;
  abort: () => void;
  begin: () => void;
};

type ApplePaySessionConstructor = {
  new (version: number, paymentRequest: Record<string, unknown>): ApplePaySessionInstance;
  canMakePayments: () => boolean;
  STATUS_SUCCESS: number;
  STATUS_FAILURE: number;
};

/** Apple Pay mag Sonderzeichen im total.label oft nicht — Apostroph vermeiden. */
const APPLE_PAY_STORE_LABEL = "jerrys";

function moneyStringFromGrossCents(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function formatExpressSdkError(error: unknown, fallback: string): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" &&
            error &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "";
  const code = raw.toUpperCase();
  if (
    code.includes("APPLE_PAY_MERCHANT_SESSION_VALIDATION") ||
    code.includes("MERCHANT_SESSION_VALIDATION")
  ) {
    return (
      "Apple Pay: Händler-/Domain-Prüfung fehlgeschlagen. " +
      "Die aktuelle Shop-Domain muss exakt bei PayPal unter Apple Pay registriert sein " +
      "(inkl. www falls genutzt), und /.well-known/apple-developer-merchantid-domain-association " +
      "muss ohne Weiterleitung erreichbar sein."
    );
  }
  if (raw.trim()) return raw.trim();
  return fallback;
}

function merchantSessionForApple(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

function currentPayPal(): PayPalExpressSdk | undefined {
  return (window as unknown as { paypal?: PayPalExpressSdk }).paypal;
}

function currentApplePaySession(): ApplePaySessionConstructor | undefined {
  return (window as unknown as { ApplePaySession?: ApplePaySessionConstructor }).ApplePaySession;
}

function applePaySessionCanMakePayments(): boolean {
  try {
    const ApplePaySession = currentApplePaySession();
    return Boolean(ApplePaySession && ApplePaySession.canMakePayments());
  } catch {
    return false;
  }
}

export type PdpExpressLine = {
  productId: string;
  productVariantId: string;
  quantity: number;
};

type Props = {
  /** Ohne PayPal-Credentials keine Express-Zahlung. */
  payPalConfigured: boolean;
  paypalClientId: string;
  currency?: string;
  totalGrossCents?: number;
  /** Legacy-Prop: die Komponente wird heute im Warenkorb genutzt. */
  variant?: "checkout" | "cart" | "pdp";
  /**
   * Shopify-ähnlich auf der PDP: vor createOrder Warenkorb auf diese Position setzen
   * (Buy-now / Dynamic Checkout).
   */
  pdpExpress?: PdpExpressLine | null;
  /** Buttons deaktivieren (z. B. nicht bestellbar). */
  enabled?: boolean;
};

export function CheckoutExpressPayPalOnly({
  payPalConfigured,
  paypalClientId,
  currency = "EUR",
  totalGrossCents = 0,
  variant = "cart",
  pdpExpress = null,
  enabled = true,
}: Props) {
  const router = useRouter();
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRef = useRef<PayPalButtonsInstance | null>(null);
  const applePayPaypalContainerRef = useRef<HTMLDivElement>(null);
  const applePayPaypalButtonsRef = useRef<PayPalButtonsInstance | null>(null);
  const applePaySessionRef = useRef<PayPalApplePaySession | null>(null);
  const applePayConfigRef = useRef<PayPalApplePayConfig | null>(null);
  const applePaySetupErrorRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastExpressPaypalOrderIdRef = useRef<string | null>(null);
  const liveTotalCentsRef = useRef(totalGrossCents);
  const pdpExpressRef = useRef(pdpExpress);
  pdpExpressRef.current = pdpExpress;
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applePayDeviceReady, setApplePayDeviceReady] = useState(false);
  const [liveTotalCents, setLiveTotalCents] = useState(totalGrossCents);

  useEffect(() => {
    setLiveTotalCents(totalGrossCents);
    liveTotalCentsRef.current = totalGrossCents;
  }, [totalGrossCents]);

  useEffect(() => {
    liveTotalCentsRef.current = liveTotalCents;
  }, [liveTotalCents]);

  const ensureIdempotencyKey = useCallback((): string | undefined => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null;
    }
    return idempotencyKeyRef.current ?? undefined;
  }, []);

  const preparePdpCartIfNeeded = useCallback(async () => {
    const line = pdpExpressRef.current;
    if (!line) return;
    const res = await fetch("/api/checkout/paypal/express-prepare-pdp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(line),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      totalGrossCents?: number;
    };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Express-Warenkorb konnte nicht vorbereitet werden.");
    }
    if (typeof data.totalGrossCents === "number") {
      liveTotalCentsRef.current = data.totalGrossCents;
      setLiveTotalCents(data.totalGrossCents);
    }
  }, []);

  const selectedShippingCountryRef = useRef<string | null>(null);

  const createExpressOrder = useCallback(async (shippingCountry?: string | null) => {
    setSdkError(null);
    await preparePdpCartIfNeeded();
    const country =
      (typeof shippingCountry === "string" && shippingCountry.trim()) ||
      selectedShippingCountryRef.current ||
      undefined;
    const res = await fetch("/api/checkout/paypal/express-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: ensureIdempotencyKey(),
        shippingCountry: country,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      paypalOrderId?: string;
      orderNumber?: string;
      error?: string;
    };
    if (res.status === 409 && data.orderNumber) {
      router.push(`/checkout/erfolg?nr=${encodeURIComponent(data.orderNumber)}`);
      throw new Error("Bestellung ist bereits abgeschlossen.");
    }
    if (!res.ok || !data.paypalOrderId) {
      throw new Error(data.error ?? "PayPal Express konnte nicht gestartet werden.");
    }
    lastExpressPaypalOrderIdRef.current = data.paypalOrderId;
    return data.paypalOrderId;
  }, [ensureIdempotencyKey, preparePdpCartIfNeeded, router]);

  const updateExpressShipping = useCallback(async (paypalOrderId: string, shippingCountry: string) => {
    const res = await fetch("/api/checkout/paypal/express-update-shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId, shippingCountry }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      totalGrossCents?: number;
    };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Versand für dieses Land nicht möglich.");
    }
    if (typeof data.totalGrossCents === "number") {
      liveTotalCentsRef.current = data.totalGrossCents;
      setLiveTotalCents(data.totalGrossCents);
    }
  }, []);

  const quoteExpressShipping = useCallback(async (shippingCountry: string) => {
    const res = await fetch("/api/checkout/paypal/express-shipping-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingCountry }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      totalGrossCents?: number;
    };
    if (!res.ok || !data.ok || typeof data.totalGrossCents !== "number") {
      throw new Error(data.error ?? "Versand für dieses Land nicht möglich.");
    }
    liveTotalCentsRef.current = data.totalGrossCents;
    setLiveTotalCents(data.totalGrossCents);
    selectedShippingCountryRef.current = shippingCountry.trim().toUpperCase();
    return data.totalGrossCents;
  }, []);

  const approveExpressOrder = useCallback(
    async (paypalOrderId: string, applePayShippingContact?: unknown) => {
      const res = await fetch("/api/checkout/paypal/express-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId, applePayShippingContact }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectUrl?: string;
        orderNumber?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "PayPal Express konnte nicht abgeschlossen werden.");
      }
      lastExpressPaypalOrderIdRef.current = null;
      idempotencyKeyRef.current = null;
      router.push(data.redirectUrl ?? `/checkout/erfolg?nr=${encodeURIComponent(data.orderNumber ?? "")}`);
    },
    [router],
  );

  const cancelExpressOrder = useCallback(async (paypalOrderId?: string | null) => {
    const id =
      (typeof paypalOrderId === "string" ? paypalOrderId.trim() : "") ||
      lastExpressPaypalOrderIdRef.current ||
      "";
    if (!id) return;
    try {
      await fetch("/api/checkout/paypal/express-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId: id }),
      });
    } catch {
      // Abbruch-Cleanup best effort — Bestand läuft sonst über Reservation-Expiry aus.
    }
    lastExpressPaypalOrderIdRef.current = null;
    idempotencyKeyRef.current = null;
  }, []);

  const createExpressOrderRef = useRef(createExpressOrder);
  const approveExpressOrderRef = useRef(approveExpressOrder);
  const cancelExpressOrderRef = useRef(cancelExpressOrder);
  const updateExpressShippingRef = useRef(updateExpressShipping);
  const quoteExpressShippingRef = useRef(quoteExpressShipping);
  createExpressOrderRef.current = createExpressOrder;
  approveExpressOrderRef.current = approveExpressOrder;
  cancelExpressOrderRef.current = cancelExpressOrder;
  updateExpressShippingRef.current = updateExpressShipping;
  quoteExpressShippingRef.current = quoteExpressShipping;

  // SDK nur bei echten Config-Änderungen neu mounten — nicht bei jedem Total-Update
  // (sonst reißt liveTotalCents den Apple-Pay-Flow mitten im Sheet ab).
  useEffect(() => {
    setSdkError(null);
    setApplePayDeviceReady(false);
    applePayConfigRef.current = null;
    applePaySessionRef.current = null;
    applePaySetupErrorRef.current = null;
    paypalButtonsRef.current?.close?.();
    paypalButtonsRef.current = null;
    applePayPaypalButtonsRef.current?.close?.();
    applePayPaypalButtonsRef.current = null;
    if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = "";
    if (applePayPaypalContainerRef.current) applePayPaypalContainerRef.current.innerHTML = "";

    if (!enabled || !payPalConfigured || !paypalClientId.trim()) return;

    const scriptId = `paypal-js-express-checkout-${currency.trim().toUpperCase()}-applepay`;
    let cancelled = false;

    const expressButtonOptions = (paypal: PayPalExpressSdk, fundingSource: string | undefined) => ({
      fundingSource,
      style:
        fundingSource && fundingSource === paypal.FUNDING?.APPLEPAY
          ? { layout: "vertical", color: "black", shape: "rect", height: 44 }
          : { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 44 },
      createOrder: () => createExpressOrderRef.current(),
      onShippingAddressChange: async (data: {
        orderID?: string;
        shippingAddress?: { countryCode?: string };
        errors?: { ADDRESS_ERROR?: string };
      }) => {
        const country = data.shippingAddress?.countryCode?.trim().toUpperCase() ?? "";
        const orderId = data.orderID ?? lastExpressPaypalOrderIdRef.current ?? "";
        if (!country || !orderId) {
          throw new Error(data.errors?.ADDRESS_ERROR ?? "Lieferadresse ungültig.");
        }
        try {
          await updateExpressShippingRef.current(orderId, country);
          selectedShippingCountryRef.current = country;
        } catch (e) {
          throw new Error(
            e instanceof Error
              ? e.message
              : (data.errors?.ADDRESS_ERROR ?? "Lieferung an diese Adresse nicht möglich."),
          );
        }
      },
      onApprove: async (data: { orderID?: string }) => {
        const orderId = data.orderID;
        if (!orderId) throw new Error("PayPal Order-ID fehlt.");
        setBusy(true);
        try {
          await approveExpressOrderRef.current(orderId);
        } finally {
          setBusy(false);
        }
      },
      onCancel: async (data: { orderID?: string }) => {
        await cancelExpressOrderRef.current(data.orderID);
        setBusy(false);
        setSdkError("PayPal Express wurde abgebrochen. Es wurde nichts abgebucht.");
      },
      onError: (err: unknown) => {
        console.error(err);
        setSdkError(err instanceof Error ? err.message : "PayPal Express ist fehlgeschlagen.");
        setBusy(false);
      },
    });

    const mount = async () => {
      const paypal = currentPayPal();
      const host = paypalContainerRef.current;
      if (!paypal || !host || cancelled) return;
      if (typeof paypal.Buttons !== "function") {
        setSdkError("PayPal Express ist in dieser Umgebung nicht verfügbar.");
        return;
      }

      const deviceReady = applePaySessionCanMakePayments();
      if (!cancelled && deviceReady) setApplePayDeviceReady(true);

      host.innerHTML = "";
      const buttons = paypal.Buttons(expressButtonOptions(paypal, paypal.FUNDING?.PAYPAL));

      if (buttons.isEligible?.() === false) {
        setSdkError("PayPal Express ist für diese Umgebung nicht verfügbar.");
      } else {
        paypalButtonsRef.current = buttons;
        await buttons.render(host);
      }

      if (cancelled) return;

      if (typeof paypal.Applepay === "function" && deviceReady) {
        try {
          const applepay = paypal.Applepay();
          const config = await applepay.config();
          if (!cancelled && isPayPalApplePayConfigEligible(config)) {
            applePaySessionRef.current = applepay;
            applePayConfigRef.current = config;
          } else if (!cancelled) {
            applePaySetupErrorRef.current =
              "Apple Pay ist für diese Shop-Domain bei PayPal noch nicht freigeschaltet.";
          }
        } catch (e) {
          console.error(e);
          if (!cancelled) {
            applePaySessionRef.current = null;
            applePayConfigRef.current = null;
            applePaySetupErrorRef.current = formatExpressSdkError(
              e,
              "Apple Pay konnte nicht vorbereitet werden. Domain ggf. nicht für Apple Pay registriert.",
            );
          }
        }
      }

      if (cancelled || deviceReady) return;

      const applePayHost = applePayPaypalContainerRef.current;
      const applePayFunding = paypal.FUNDING?.APPLEPAY;
      if (!applePayHost || !applePayFunding) return;

      applePayHost.innerHTML = "";
      const applePayButtons = paypal.Buttons(expressButtonOptions(paypal, applePayFunding));
      if (applePayButtons.isEligible?.() !== false) {
        applePayPaypalButtonsRef.current = applePayButtons;
        try {
          await applePayButtons.render(applePayHost);
        } catch (e) {
          console.error(e);
          applePayPaypalButtonsRef.current = null;
          applePayHost.innerHTML = "";
        }
      }
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && currentPayPal()?.Buttons) {
      void mount();
    } else if (existing) {
      existing.addEventListener("load", () => void mount(), { once: true });
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = paypalExpressSdkSrc(paypalClientId.trim(), currency);
      script.async = true;
      script.onload = () => void mount();
      script.onerror = () => setSdkError("PayPal-Skript konnte nicht geladen werden.");
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      paypalButtonsRef.current?.close?.();
      paypalButtonsRef.current = null;
      applePayPaypalButtonsRef.current?.close?.();
      applePayPaypalButtonsRef.current = null;
      if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = "";
      if (applePayPaypalContainerRef.current) applePayPaypalContainerRef.current.innerHTML = "";
    };
  }, [
    currency,
    enabled,
    payPalConfigured,
    paypalClientId,
    pdpExpress?.productVariantId,
    pdpExpress?.quantity,
  ]);

  if (!payPalConfigured || !paypalClientId.trim()) return null;
  if (!enabled) {
    return (
      <p className="text-xs text-(--foreground-muted)" role="status">
        Express Checkout ist für diese Auswahl derzeit nicht verfügbar.
      </p>
    );
  }

  /**
   * ApplePaySession + begin() müssen synchron im User-Gesture laufen.
   * Completion-Handler für Shipping/PaymentMethod sind Pflicht, sobald
   * requiredShippingContactFields gesetzt sind — sonst schließt Safari das Sheet sofort.
   */
  const startApplePay = () => {
    const ApplePaySession = currentApplePaySession();
    const applepay = applePaySessionRef.current;
    const config = applePayConfigRef.current;
    if (!ApplePaySession) {
      setSdkError("Apple Pay ist nur in Safari auf Apple-Geräten verfügbar.");
      return;
    }
    if (!applepay || !config) {
      setSdkError(
        applePaySetupErrorRef.current ??
          "Apple Pay wird noch vorbereitet. Bitte in einem Moment erneut versuchen.",
      );
      return;
    }

    const amount = moneyStringFromGrossCents(liveTotalCentsRef.current);
    if (liveTotalCentsRef.current <= 0) {
      setSdkError("Apple Pay: Betrag fehlt. Bitte Seite neu laden.");
      return;
    }

    setBusy(true);
    setSdkError(null);

    let session: ApplePaySessionInstance;
    try {
      session = new ApplePaySession(4, {
        countryCode: config.countryCode ?? "DE",
        currencyCode: currency.trim().toUpperCase(),
        merchantCapabilities: config.merchantCapabilities ?? ["supports3DS"],
        supportedNetworks: config.supportedNetworks ?? ["visa", "masterCard", "amex", "maestro"],
        requiredShippingContactFields: ["name", "phone", "email", "postalAddress"],
        requiredBillingContactFields: ["postalAddress"],
        total: {
          label: APPLE_PAY_STORE_LABEL,
          type: "final",
          amount,
        },
      });
    } catch (e) {
      setBusy(false);
      setSdkError(e instanceof Error ? e.message : "Apple Pay konnte nicht gestartet werden.");
      return;
    }

    const totalUpdate = () => ({
      newTotal: {
        label: APPLE_PAY_STORE_LABEL,
        type: "final",
        amount: moneyStringFromGrossCents(liveTotalCentsRef.current),
      },
    });

    session.onvalidatemerchant = (event) => {
      void (async () => {
        try {
          const result = await applepay.validateMerchant({
            validationUrl: event.validationURL,
            displayName: APPLE_PAY_STORE_LABEL,
            domainName: window.location.hostname,
          });
          session.completeMerchantValidation(merchantSessionForApple(result.merchantSession));
        } catch (e) {
          console.error(e);
          setBusy(false);
          setSdkError(
            formatExpressSdkError(
              e,
              "Apple Pay Händlerprüfung fehlgeschlagen. Domain ggf. nicht für Apple Pay freigeschaltet.",
            ),
          );
          try {
            session.abort();
          } catch {
            /* sheet bereits zu */
          }
        }
      })();
    };

    // Ohne diese Completions schließt Safari das Sheet nach dem kurzen Anzeigen.
    // Premium-Muster: Versand anhand Lieferland neu quoten und Total im Sheet aktualisieren.
    session.onpaymentmethodselected = () => {
      session.completePaymentMethodSelection(totalUpdate());
    };
    session.onshippingcontactselected = (event: unknown) => {
      void (async () => {
        const contact = (event as { shippingContact?: { countryCode?: string } }).shippingContact;
        const country = contact?.countryCode?.trim().toUpperCase() ?? "";
        try {
          if (!country) throw new Error("Lieferland fehlt.");
          await quoteExpressShippingRef.current(country);
          session.completeShippingContactSelection({
            ...totalUpdate(),
            newLineItems: [],
          });
        } catch (e) {
          console.error(e);
          const ApplePayErrorCtor = (
            window as unknown as {
              ApplePayError?: new (
                code: string,
                contactField: string,
                message: string,
              ) => unknown;
            }
          ).ApplePayError;
          const errors =
            ApplePayErrorCtor != null
              ? [
                  new ApplePayErrorCtor(
                    "shippingContactInvalid",
                    "countryCode",
                    e instanceof Error ? e.message : "Lieferung in dieses Land nicht möglich.",
                  ),
                ]
              : [];
          session.completeShippingContactSelection({
            ...totalUpdate(),
            newLineItems: [],
            errors,
          });
        }
      })();
    };
    session.onshippingmethodselected = () => {
      session.completeShippingMethodSelection(totalUpdate());
    };

    session.onpaymentauthorized = (event) => {
      void (async () => {
        try {
          const country =
            (event.payment.shippingContact as { countryCode?: string } | undefined)?.countryCode ??
            selectedShippingCountryRef.current;
          const orderId = await createExpressOrderRef.current(country);
          await applepay.confirmOrder({
            orderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact,
            shippingContact: event.payment.shippingContact,
          });
          await approveExpressOrderRef.current(orderId, event.payment.shippingContact);
          session.completePayment({ status: ApplePaySession.STATUS_SUCCESS });
        } catch (e) {
          console.error(e);
          setSdkError(e instanceof Error ? e.message : "Apple Pay konnte nicht abgeschlossen werden.");
          session.completePayment({ status: ApplePaySession.STATUS_FAILURE });
          await cancelExpressOrderRef.current(lastExpressPaypalOrderIdRef.current);
        } finally {
          setBusy(false);
        }
      })();
    };

    session.oncancel = () => {
      void cancelExpressOrderRef.current(lastExpressPaypalOrderIdRef.current);
      setBusy(false);
      setSdkError("Apple Pay wurde abgebrochen. Es wurde nichts abgebucht.");
    };

    try {
      session.begin();
    } catch (e) {
      setBusy(false);
      setSdkError(e instanceof Error ? e.message : "Apple Pay konnte nicht gestartet werden.");
    }
  };

  const alignClass =
    variant === "pdp" || variant === "checkout" ? "text-left" : "text-left lg:text-right";
  const widthClass = variant === "checkout" ? "w-full" : "w-full max-w-md";

  return (
    <div className={`${widthClass} space-y-3 ${alignClass}`} aria-busy={busy}>
      {applePayDeviceReady ? (
        <button
          type="button"
          disabled={busy}
          onClick={startApplePay}
          className="flex min-h-[2.75rem] w-full items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Mit Apple Pay Express bezahlen"
        >
          Apple Pay
        </button>
      ) : null}
      <div ref={applePayPaypalContainerRef} className="w-full empty:hidden" />
      <div ref={paypalContainerRef} className="min-h-[2.75rem] w-full" />
      {sdkError ? (
        <p className="text-xs leading-snug text-red-600" role="alert">
          {sdkError}
        </p>
      ) : null}
      <p
        className={`text-xs leading-snug text-[#6b7280] ${
          variant === "checkout" ? "w-full max-w-none text-left" : ""
        }`}
      >
        Mit der Express-Zahlung akzeptierst du unsere{" "}
        <Link href="/agb" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          AGB
        </Link>
        , die{" "}
        <Link href="/widerruf" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          Widerrufsbelehrung
        </Link>{" "}
        und die{" "}
        <Link href="/datenschutz" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          Datenschutzerklärung
        </Link>
        . Versandkosten richten sich nach der Lieferadresse aus PayPal bzw. Apple Pay.
      </p>
    </div>
  );
}
