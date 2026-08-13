"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  validateMerchant: (options: { validationUrl: string; displayName?: string }) => Promise<{ merchantSession: unknown }>;
  confirmOrder: (options: {
    orderId: string;
    token: unknown;
    billingContact?: unknown;
    shippingContact?: unknown;
  }) => Promise<unknown>;
};

type PayPalExpressSdk = {
  FUNDING?: { PAYPAL?: string };
  Buttons?: (options: Record<string, unknown>) => PayPalButtonsInstance;
  Applepay?: () => PayPalApplePaySession;
};

type ApplePaySessionInstance = {
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
  onpaymentauthorized:
    | ((event: { payment: { token: unknown; billingContact?: unknown; shippingContact?: unknown } }) => void)
    | null;
  oncancel: (() => void) | null;
  completeMerchantValidation: (merchantSession: unknown) => void;
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

function paypalExpressSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "buttons,applepay",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "disable-funding": "card,paylater,venmo,sepa,bancontact,blik,eps,giropay,ideal,mybank,p24,sofort",
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

function currentPayPal(): PayPalExpressSdk | undefined {
  return (window as unknown as { paypal?: PayPalExpressSdk }).paypal;
}

function currentApplePaySession(): ApplePaySessionConstructor | undefined {
  return (window as unknown as { ApplePaySession?: ApplePaySessionConstructor }).ApplePaySession;
}

function moneyStringFromGrossCents(cents: number): string {
  return (cents / 100).toFixed(2);
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
  const applePaySessionRef = useRef<PayPalApplePaySession | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastExpressPaypalOrderIdRef = useRef<string | null>(null);
  const pdpExpressRef = useRef(pdpExpress);
  pdpExpressRef.current = pdpExpress;
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applePayConfig, setApplePayConfig] = useState<PayPalApplePayConfig | null>(null);
  const [liveTotalCents, setLiveTotalCents] = useState(totalGrossCents);

  useEffect(() => {
    setLiveTotalCents(totalGrossCents);
  }, [totalGrossCents]);

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
      setLiveTotalCents(data.totalGrossCents);
    }
  }, []);

  const createExpressOrder = useCallback(async () => {
    setSdkError(null);
    await preparePdpCartIfNeeded();
    const res = await fetch("/api/checkout/paypal/express-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: ensureIdempotencyKey() }),
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

  useEffect(() => {
    setSdkError(null);
    setApplePayConfig(null);
    paypalButtonsRef.current?.close?.();
    paypalButtonsRef.current = null;
    if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = "";

    if (!enabled || !payPalConfigured || !paypalClientId.trim()) return;

    const scriptId = `paypal-js-express-checkout-${currency.trim().toUpperCase()}`;
    let cancelled = false;

    const mount = async () => {
      const paypal = currentPayPal();
      const host = paypalContainerRef.current;
      if (!paypal || !host || cancelled) return;
      if (typeof paypal.Buttons !== "function") {
        setSdkError("PayPal Express ist in dieser Umgebung nicht verfügbar.");
        return;
      }

      host.innerHTML = "";
      const buttons = paypal.Buttons({
        fundingSource: paypal.FUNDING?.PAYPAL,
        style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 44 },
        createOrder: createExpressOrder,
        onApprove: async (data: { orderID?: string }) => {
          const orderId = data.orderID;
          if (!orderId) throw new Error("PayPal Order-ID fehlt.");
          setBusy(true);
          try {
            await approveExpressOrder(orderId);
          } finally {
            setBusy(false);
          }
        },
        onCancel: async (data: { orderID?: string }) => {
          await cancelExpressOrder(data.orderID);
          setSdkError("PayPal Express wurde abgebrochen. Es wurde nichts abgebucht.");
        },
        onError: (err: unknown) => {
          console.error(err);
          setSdkError(err instanceof Error ? err.message : "PayPal Express ist fehlgeschlagen.");
          setBusy(false);
        },
      });

      if (buttons.isEligible?.() === false) {
        setSdkError("PayPal Express ist für diese Umgebung nicht verfügbar.");
      } else {
        paypalButtonsRef.current = buttons;
        await buttons.render(host);
      }

      const ApplePaySession = currentApplePaySession();
      if (typeof paypal.Applepay === "function" && ApplePaySession?.canMakePayments() && liveTotalCents > 0) {
        try {
          const applepay = paypal.Applepay();
          const config = await applepay.config();
          if (!cancelled && config.isEligible) {
            applePaySessionRef.current = applepay;
            setApplePayConfig(config);
          }
        } catch {
          if (!cancelled) setApplePayConfig(null);
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
      if (paypalContainerRef.current) paypalContainerRef.current.innerHTML = "";
    };
  }, [
    approveExpressOrder,
    cancelExpressOrder,
    createExpressOrder,
    currency,
    enabled,
    liveTotalCents,
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

  const startApplePay = async () => {
    const ApplePaySession = currentApplePaySession();
    const applepay = applePaySessionRef.current;
    if (!ApplePaySession || !applepay || !applePayConfig) return;

    setBusy(true);
    setSdkError(null);
    try {
      const session = new ApplePaySession(4, {
        countryCode: applePayConfig.countryCode ?? "DE",
        currencyCode: currency.trim().toUpperCase(),
        merchantCapabilities: applePayConfig.merchantCapabilities ?? ["supports3DS"],
        supportedNetworks: applePayConfig.supportedNetworks ?? ["visa", "masterCard", "amex", "maestro"],
        requiredShippingContactFields: ["name", "phone", "email", "postalAddress"],
        requiredBillingContactFields: ["postalAddress"],
        total: {
          label: "jerry's",
          type: "final",
          amount: moneyStringFromGrossCents(liveTotalCents),
        },
      });

      session.onvalidatemerchant = async (event) => {
        try {
          const result = await applepay.validateMerchant({
            validationUrl: event.validationURL,
            displayName: "jerry's",
          });
          session.completeMerchantValidation(result.merchantSession);
        } catch (e) {
          console.error(e);
          session.abort();
        }
      };

      session.onpaymentauthorized = async (event) => {
        try {
          const orderId = await createExpressOrder();
          await applepay.confirmOrder({
            orderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact,
            shippingContact: event.payment.shippingContact,
          });
          await approveExpressOrder(orderId, event.payment.shippingContact);
          session.completePayment({ status: ApplePaySession.STATUS_SUCCESS });
        } catch (e) {
          console.error(e);
          setSdkError(e instanceof Error ? e.message : "Apple Pay konnte nicht abgeschlossen werden.");
          session.completePayment({ status: ApplePaySession.STATUS_FAILURE });
          await cancelExpressOrder(lastExpressPaypalOrderIdRef.current);
        } finally {
          setBusy(false);
        }
      };

      session.oncancel = () => {
        void cancelExpressOrder(lastExpressPaypalOrderIdRef.current);
        setBusy(false);
        setSdkError("Apple Pay wurde abgebrochen. Es wurde nichts abgebucht.");
      };

      session.begin();
    } catch (e) {
      setBusy(false);
      setSdkError(e instanceof Error ? e.message : "Apple Pay konnte nicht gestartet werden.");
    }
  };

  const alignClass =
    variant === "pdp" ? "text-left" : "text-left lg:text-right";

  return (
    <div className={`w-full max-w-md space-y-3 ${alignClass}`} aria-busy={busy}>
      {applePayConfig ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startApplePay()}
          className="flex min-h-[2.75rem] w-full items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Mit Apple Pay Express bezahlen"
        >
          Apple Pay
        </button>
      ) : null}
      <div ref={paypalContainerRef} className="min-h-[2.75rem] w-full" />
      {sdkError ? (
        <p className="text-xs leading-snug text-red-600" role="alert">
          {sdkError}
        </p>
      ) : null}
      <p className="text-xs leading-snug text-[#6b7280]">
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
        . PayPal bzw. Apple Pay übermittelt die Lieferadresse; der MVP berechnet Versand für Deutschland.
      </p>
    </div>
  );
}
