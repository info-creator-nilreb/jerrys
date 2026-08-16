"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GOOGLE_PAY_JS_SRC,
  isPayPalApplePayConfigEligible,
  paypalCheckoutApplePaySdkSrc,
  paypalCheckoutWalletSdkSrc,
} from "@/lib/payments/paypal-express-sdk";

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

type PayPalGooglepay = {
  config: () => Promise<Record<string, unknown>>;
  confirmOrder: (options: {
    orderId: string;
    paymentMethodData: unknown;
  }) => Promise<{ status?: string }>;
  initiatePayerAction?: (options: { orderId: string }) => Promise<unknown>;
};

type PayPalWalletSdk = {
  Applepay?: () => PayPalApplePaySession;
  Googlepay?: () => PayPalGooglepay;
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

type GooglePayClient = {
  isReadyToPay: (request: Record<string, unknown>) => Promise<{ result?: boolean }>;
  loadPaymentData: (request: Record<string, unknown>) => Promise<{ paymentMethodData?: unknown }>;
};

const GOOGLE_PAY_SCRIPT_ID = "google-pay-js-checkout";
const WALLET_SDK_SCRIPT_ID = "paypal-js-checkout-wallets";

function moneyStringFromGrossCents(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function currentPayPal(): PayPalWalletSdk | undefined {
  return (window as unknown as { paypal?: PayPalWalletSdk }).paypal;
}

function currentApplePaySession(): ApplePaySessionConstructor | undefined {
  return (window as unknown as { ApplePaySession?: ApplePaySessionConstructor }).ApplePaySession;
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

async function createOrderFromCheckoutForm(form: HTMLFormElement): Promise<{
  paypalOrderId: string;
  orderNumber?: string;
}> {
  if (!form.reportValidity()) {
    throw new Error("Bitte alle Pflichtfelder und die rechtlichen Hinweise prüfen.");
  }
  const res = await fetch("/api/checkout/paypal/create-order", {
    method: "POST",
    body: new FormData(form),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    paypalOrderId?: string;
    orderNumber?: string;
    error?: string;
  };
  if (res.status === 409 && data.orderNumber) {
    return { paypalOrderId: "", orderNumber: data.orderNumber };
  }
  if (!res.ok || !data.paypalOrderId) {
    throw new Error(data.error ?? "Bestellung konnte nicht gestartet werden.");
  }
  return { paypalOrderId: data.paypalOrderId, orderNumber: data.orderNumber };
}

async function captureCheckoutOrder(paypalOrderId: string): Promise<{ redirectUrl: string; orderNumber?: string }> {
  const res = await fetch("/api/checkout/paypal/capture-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paypalOrderId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    redirectUrl?: string;
    orderNumber?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Zahlung konnte nicht abgeschlossen werden.");
  }
  return {
    redirectUrl: data.redirectUrl ?? `/checkout/erfolg?nr=${encodeURIComponent(data.orderNumber ?? "")}`,
    orderNumber: data.orderNumber,
  };
}

async function cancelPendingOrder(paypalOrderId: string | null): Promise<void> {
  const id = paypalOrderId?.trim() ?? "";
  if (!id) return;
  try {
    await fetch("/api/checkout/paypal/express-cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId: id }),
    });
  } catch {
    // best effort
  }
}

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Skript konnte nicht geladen werden.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Skript konnte nicht geladen werden."));
    };
    document.body.appendChild(script);
  });
}

async function tryLoadScript(id: string, src: string): Promise<boolean> {
  try {
    await loadScript(id, src);
    return true;
  } catch {
    return false;
  }
}

async function waitForPayPalWalletSdk(timeoutMs = 2500): Promise<PayPalWalletSdk | undefined> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const paypal = currentPayPal();
    if (typeof paypal?.Applepay === "function" || typeof paypal?.Googlepay === "function") {
      return paypal;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  const paypal = currentPayPal();
  if (typeof paypal?.Applepay === "function" || typeof paypal?.Googlepay === "function") {
    return paypal;
  }
  return undefined;
}

export type CheckoutWalletReady = {
  applePay: boolean;
  googlePay: boolean;
};

export type CheckoutWalletStartRef = {
  startApplePay: ((form: HTMLFormElement) => void) | null;
  startGooglePay: ((form: HTMLFormElement) => Promise<void>) | null;
};

export function CheckoutRegularWallets({
  paypalClientId,
  currency,
  payPalLive,
  totalGrossCents,
  applePayStoreLabel,
  onReadyChange,
  onBusyChange,
  onError,
  startRef,
}: {
  paypalClientId: string;
  currency: string;
  payPalLive: boolean;
  totalGrossCents: number;
  applePayStoreLabel: string;
  onReadyChange?: (ready: CheckoutWalletReady) => void;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string | null) => void;
  startRef?: CheckoutWalletStartRef;
}) {
  const router = useRouter();
  const applePayRef = useRef<PayPalApplePaySession | null>(null);
  const applePayConfigRef = useRef<PayPalApplePayConfig | null>(null);
  const googlePayRef = useRef<PayPalGooglepay | null>(null);
  const googlePayConfigRef = useRef<Record<string, unknown> | null>(null);
  const googlePayClientRef = useRef<GooglePayClient | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);
  const totalRef = useRef(totalGrossCents);
  totalRef.current = totalGrossCents;
  const [ready, setReady] = useState<CheckoutWalletReady>({ applePay: false, googlePay: false });

  const setBusy = useCallback(
    (busy: boolean) => {
      onBusyChange?.(busy);
    },
    [onBusyChange],
  );

  const setError = useCallback(
    (message: string | null) => {
      onError?.(message);
    },
    [onError],
  );

  useEffect(() => {
    onReadyChange?.(ready);
  }, [onReadyChange, ready]);

  useEffect(() => {
    if (!paypalClientId.trim()) return;
    let cancelled = false;

    const setup = async () => {
      let paypal = await waitForPayPalWalletSdk();
      if (!paypal) {
        const loadedCombined = await tryLoadScript(
          WALLET_SDK_SCRIPT_ID,
          paypalCheckoutWalletSdkSrc(paypalClientId.trim(), currency),
        );
        if (!loadedCombined) {
          await tryLoadScript(
            WALLET_SDK_SCRIPT_ID,
            paypalCheckoutApplePaySdkSrc(paypalClientId.trim(), currency),
          );
        }
        paypal = currentPayPal();
      }
      await tryLoadScript(GOOGLE_PAY_SCRIPT_ID, GOOGLE_PAY_JS_SRC);
      if (cancelled) return;

      paypal = currentPayPal();
      const ApplePaySession = currentApplePaySession();
      const next: CheckoutWalletReady = { applePay: false, googlePay: false };

      if (typeof paypal?.Applepay === "function" && ApplePaySession?.canMakePayments?.()) {
        try {
          const applepay = paypal.Applepay();
          const config = await applepay.config();
          if (!cancelled && isPayPalApplePayConfigEligible(config)) {
            applePayRef.current = applepay;
            applePayConfigRef.current = config;
            next.applePay = true;
          }
        } catch {
          applePayRef.current = null;
          applePayConfigRef.current = null;
        }
      }

      const GooglepayCtor = (
        window as unknown as {
          google?: { payments?: { api?: { PaymentsClient?: new (opts: { environment: string }) => GooglePayClient } } };
        }
      ).google?.payments?.api?.PaymentsClient;

      if (typeof paypal?.Googlepay === "function" && GooglepayCtor) {
        try {
          const googlepay = paypal.Googlepay();
          const config = await googlepay.config();
          const client = new GooglepayCtor({
            environment: payPalLive ? "PRODUCTION" : "TEST",
          });
          const readyToPay = await client.isReadyToPay(config);
          if (!cancelled && readyToPay.result !== false) {
            googlePayRef.current = googlepay;
            googlePayConfigRef.current = config;
            googlePayClientRef.current = client;
            next.googlePay = true;
          }
        } catch {
          googlePayRef.current = null;
          googlePayConfigRef.current = null;
          googlePayClientRef.current = null;
        }
      }

      if (!cancelled) setReady(next);
    };

    void setup();
    return () => {
      cancelled = true;
    };
  }, [currency, payPalLive, paypalClientId, setError]);

  const finishSuccess = useCallback(
    (redirectUrl: string) => {
      lastOrderIdRef.current = null;
      router.push(redirectUrl);
    },
    [router],
  );

  const startApplePay = useCallback(
    (form: HTMLFormElement) => {
      const ApplePaySession = currentApplePaySession();
      const applepay = applePayRef.current;
      const config = applePayConfigRef.current;
      if (!ApplePaySession || !applepay || !config) {
        setError("Apple Pay ist auf diesem Gerät nicht verfügbar.");
        return;
      }
      if (!form.reportValidity()) return;

      setBusy(true);
      setError(null);

      let session: ApplePaySessionInstance;
      try {
        session = new ApplePaySession(4, {
          countryCode: config.countryCode ?? "DE",
          currencyCode: currency.trim().toUpperCase(),
          merchantCapabilities: config.merchantCapabilities ?? ["supports3DS"],
          supportedNetworks: config.supportedNetworks ?? ["visa", "masterCard", "amex", "maestro"],
          total: {
            label: applePayStoreLabel,
            type: "final",
            amount: moneyStringFromGrossCents(totalRef.current),
          },
        });
      } catch (e) {
        setBusy(false);
        setError(e instanceof Error ? e.message : "Apple Pay konnte nicht gestartet werden.");
        return;
      }

      session.onvalidatemerchant = (event) => {
        void (async () => {
          try {
            const result = await applepay.validateMerchant({
              validationUrl: event.validationURL,
              displayName: applePayStoreLabel,
              domainName: window.location.hostname,
            });
            session.completeMerchantValidation(merchantSessionForApple(result.merchantSession));
          } catch (e) {
            setBusy(false);
            setError(e instanceof Error ? e.message : "Apple Pay Händlerprüfung fehlgeschlagen.");
            try {
              session.abort();
            } catch {
              /* sheet bereits zu */
            }
          }
        })();
      };

      session.onpaymentauthorized = (event) => {
        void (async () => {
          try {
            const created = await createOrderFromCheckoutForm(form);
            if (created.orderNumber && !created.paypalOrderId) {
              session.completePayment({ status: ApplePaySession.STATUS_SUCCESS });
              finishSuccess(`/checkout/erfolg?nr=${encodeURIComponent(created.orderNumber)}`);
              return;
            }
            lastOrderIdRef.current = created.paypalOrderId;
            await applepay.confirmOrder({
              orderId: created.paypalOrderId,
              token: event.payment.token,
              billingContact: event.payment.billingContact,
              shippingContact: event.payment.shippingContact,
            });
            const captured = await captureCheckoutOrder(created.paypalOrderId);
            session.completePayment({ status: ApplePaySession.STATUS_SUCCESS });
            finishSuccess(captured.redirectUrl);
          } catch (e) {
            session.completePayment({ status: ApplePaySession.STATUS_FAILURE });
            await cancelPendingOrder(lastOrderIdRef.current);
            lastOrderIdRef.current = null;
            setError(e instanceof Error ? e.message : "Apple Pay konnte nicht abgeschlossen werden.");
          } finally {
            setBusy(false);
          }
        })();
      };

      session.oncancel = () => {
        void cancelPendingOrder(lastOrderIdRef.current);
        lastOrderIdRef.current = null;
        setBusy(false);
        setError("Apple Pay wurde abgebrochen. Es wurde nichts abgebucht.");
      };

      try {
        session.begin();
      } catch (e) {
        setBusy(false);
        setError(e instanceof Error ? e.message : "Apple Pay konnte nicht gestartet werden.");
      }
    },
    [currency, finishSuccess, setBusy, setError],
  );

  const startGooglePay = useCallback(
    async (form: HTMLFormElement) => {
      const googlepay = googlePayRef.current;
      const config = googlePayConfigRef.current;
      const client = googlePayClientRef.current;
      if (!googlepay || !config || !client) {
        setError("Google Pay ist auf diesem Gerät nicht verfügbar.");
        return;
      }
      if (!form.reportValidity()) return;

      setBusy(true);
      setError(null);
      try {
        const paymentDataRequest = {
          ...config,
          transactionInfo: {
            currencyCode: currency.trim().toUpperCase(),
            totalPriceStatus: "FINAL",
            totalPrice: moneyStringFromGrossCents(totalRef.current),
          },
        };
        const paymentData = await client.loadPaymentData(paymentDataRequest);
        const created = await createOrderFromCheckoutForm(form);
        if (created.orderNumber && !created.paypalOrderId) {
          finishSuccess(`/checkout/erfolg?nr=${encodeURIComponent(created.orderNumber)}`);
          return;
        }
        lastOrderIdRef.current = created.paypalOrderId;
        const confirmed = await googlepay.confirmOrder({
          orderId: created.paypalOrderId,
          paymentMethodData: paymentData.paymentMethodData,
        });
        if ((confirmed.status ?? "").toUpperCase() === "PAYER_ACTION_REQUIRED") {
          await googlepay.initiatePayerAction?.({ orderId: created.paypalOrderId });
        }
        const captured = await captureCheckoutOrder(created.paypalOrderId);
        finishSuccess(captured.redirectUrl);
      } catch (e) {
        await cancelPendingOrder(lastOrderIdRef.current);
        lastOrderIdRef.current = null;
        const name = e && typeof e === "object" && "statusCode" in e ? String((e as { statusCode: unknown }).statusCode) : "";
        if (name === "CANCELED") {
          setError("Google Pay wurde abgebrochen. Es wurde nichts abgebucht.");
        } else {
          setError(e instanceof Error ? e.message : "Google Pay konnte nicht abgeschlossen werden.");
        }
      } finally {
        setBusy(false);
      }
    },
    [currency, finishSuccess, setBusy, setError],
  );

  useEffect(() => {
    if (!startRef) return;
    startRef.startApplePay = startApplePay;
    startRef.startGooglePay = startGooglePay;
    return () => {
      startRef.startApplePay = null;
      startRef.startGooglePay = null;
    };
  }, [startApplePay, startGooglePay, startRef]);

  return null;
}
