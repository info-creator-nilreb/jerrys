"use client";

import { useEffect, useId, useRef } from "react";
import { paypalPayLaterMessagesSdkSrc } from "@/lib/payments/paypal-express-sdk";

export type PayPalPayLaterPageType = "home" | "product-details" | "cart" | "checkout";

type PayPalMessagesInstance = { render: (target: string | HTMLElement) => Promise<void> };

type PayPalMessagesSdk = {
  Messages?: (config: Record<string, unknown>) => PayPalMessagesInstance;
};

function moneyAmountFromCents(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function payLaterMessagesScriptId(currency: string): string {
  return `paypal-js-pay-later-messages-${currency.trim().toUpperCase()}`;
}

function currentPayPal(): PayPalMessagesSdk | undefined {
  return (window as unknown as { paypal?: PayPalMessagesSdk }).paypal;
}

function waitForPayPalMessages(maxMs: number, intervalMs = 100): Promise<PayPalMessagesSdk | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const paypal = currentPayPal();
      if (typeof paypal?.Messages === "function") {
        resolve(paypal);
        return;
      }
      if (Date.now() - started >= maxMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function loadPayLaterMessagesScript(clientId: string, currency: string): Promise<void> {
  const scriptId = payLaterMessagesScriptId(currency);
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (existing && typeof currentPayPal()?.Messages === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("PayPal Messages SDK")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = paypalPayLaterMessagesSdkSrc(clientId, currency);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("PayPal Messages SDK"));
    };
    document.body.appendChild(script);
  });
}

/**
 * Dynamisches PayPal-„Später bezahlen“-Banner (offizielle Messages-Komponente).
 * Blendet sich leer, wenn PayPal für Betrag/Konto keine Finanzierung anbietet.
 */
export function PayPalPayLaterMessage({
  paypalClientId,
  currency = "EUR",
  amountGrossCents,
  pageType,
  className,
}: {
  paypalClientId: string;
  currency?: string;
  amountGrossCents: number;
  pageType: PayPalPayLaterPageType;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostId = useId().replace(/:/g, "");

  useEffect(() => {
    const clientId = paypalClientId.trim();
    if (!clientId || amountGrossCents <= 0) return;

    let cancelled = false;

    const render = async () => {
      const host = containerRef.current;
      if (!host || cancelled) return;

      host.innerHTML = "";

      let paypal = await waitForPayPalMessages(400);
      if (cancelled) return;

      if (typeof paypal?.Messages !== "function") {
        try {
          await loadPayLaterMessagesScript(clientId, currency);
        } catch {
          return;
        }
        paypal = await waitForPayPalMessages(8000);
      }

      if (cancelled || !containerRef.current || typeof paypal?.Messages !== "function") return;

      try {
        const instance = paypal.Messages({
          amount: moneyAmountFromCents(amountGrossCents),
          pageType,
          style: {
            layout: "text",
            logo: { type: "primary", position: "top" },
            text: { size: 12 },
          },
        });
        await instance.render(containerRef.current);
      } catch {
        // Keine Eligibility — kein Banner (PayPal-Standard).
      }
    };

    void render();

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [paypalClientId, currency, amountGrossCents, pageType]);

  if (!paypalClientId.trim() || amountGrossCents <= 0) return null;

  return (
    <div
      ref={containerRef}
      id={`paypal-pay-later-message-${hostId}`}
      className={className ?? "min-h-0 w-full"}
      data-testid="paypal-pay-later-message"
    />
  );
}
