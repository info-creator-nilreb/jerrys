"use client";

import { CHECKOUT_FIELD_SHELL } from "@/lib/checkout/checkout-field-shell";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type FieldControl = { render: (el: HTMLElement) => Promise<void>; close?: () => void };

type CardFieldsInstance = {
  NumberField: (opts?: Record<string, unknown>) => FieldControl;
  CVVField: (opts?: Record<string, unknown>) => FieldControl;
  ExpiryField: (opts?: Record<string, unknown>) => FieldControl;
  NameField: (opts?: Record<string, unknown>) => FieldControl;
  getState: () => Promise<{ isFormValid?: boolean }>;
  isEligible: () => boolean;
  submit: () => Promise<void>;
};

type PayPalCardSdk = {
  CardFields: (opts: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: (err: unknown) => void;
    onCancel?: () => void;
  }) => CardFieldsInstance;
};

declare global {
  interface Window {
    paypal?: PayPalCardSdk;
  }
}

function paypalCardSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "card-fields",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

/**
 * Nur erlaubte PayPal-Card-Field-Keys (s. Style Guide). Innen flach halten: ein sichtbarer Rahmen
 * kommt von `CHECKOUT_FIELD_SHELL` — sonst „Rahmen in Rahmen“ durch das gehostete Feld.
 */
const cardFieldStyle: Record<string, Record<string, string>> = {
  input: {
    "font-size": "16px",
    color: "#1f2937",
    padding: "0",
    margin: "0",
    border: "none",
    outline: "none",
    background: "transparent",
    "border-radius": "0",
    "box-shadow": "none",
    "-webkit-appearance": "none",
  },
  ":focus": {
    color: "#1f2937",
    outline: "none",
    "box-shadow": "none",
  },
  ".invalid": {
    color: "#b91c1c",
  },
  "::placeholder": {
    color: "#9ca3af",
  },
};

type Eligibility = "loading" | "eligible" | "ineligible";

function CardFieldsSkeletonOverlay() {
  const bar =
    "h-[44px] w-full rounded-md border border-[#e8eaed] bg-[#f3f4f6] motion-safe:animate-pulse motion-reduce:animate-none";
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex flex-col gap-3 rounded-lg bg-white/98 p-0.5 backdrop-blur-[1px]"
      aria-hidden
    >
      <div className="space-y-2">
        <div className="h-3.5 w-28 max-w-[45%] rounded bg-[#e5e7eb] motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className={bar} />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-32 max-w-[50%] rounded bg-[#e5e7eb] motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className={bar} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="h-3.5 w-24 rounded bg-[#e5e7eb] motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className={bar} />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded bg-[#e5e7eb] motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className={bar} />
        </div>
      </div>
    </div>
  );
}

export function PayPalCardFieldsCheckout({
  formId,
  paypalClientId,
  currency,
  onEligibleChange,
}: {
  formId: string;
  paypalClientId: string;
  currency: string;
  /** `true` nur bei nutzbaren Card Fields (klassischer Form-Submit wird dann ausgeblendet). */
  onEligibleChange?: (eligible: boolean) => void;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);
  const cvvRef = useRef<HTMLDivElement>(null);

  const cardFieldsRef = useRef<CardFieldsInstance | null>(null);
  const fieldControlsRef = useRef<FieldControl[]>([]);

  const [sdkError, setSdkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility>("loading");

  const notifyEligible = useCallback(
    (eligible: boolean) => {
      onEligibleChange?.(eligible);
    },
    [onEligibleChange],
  );

  useEffect(() => {
    setEligibility("loading");
    setSdkError(null);

    if (!paypalClientId.trim()) {
      setEligibility("ineligible");
      return;
    }

    const scriptId = "paypal-js-card-fields-checkout";
    let cancelled = false;

    const clearMountHosts = () => {
      for (const r of [nameRef, numberRef, expiryRef, cvvRef]) {
        if (r.current) r.current.innerHTML = "";
      }
    };

    const mount = () => {
      const paypal = window.paypal;
      if (!paypal || cancelled) return;
      if (typeof paypal.CardFields !== "function") {
        setSdkError("PayPal Card Fields sind in dieser Umgebung nicht verfügbar.");
        setEligibility("ineligible");
        return;
      }

      const cardFields = paypal.CardFields({
        style: cardFieldStyle,
        createOrder: async () => {
          const form = document.getElementById(formId) as HTMLFormElement | null;
          if (!form) throw new Error("Checkout-Formular nicht gefunden.");
          if (!form.reportValidity()) {
            throw new Error("Bitte alle Pflichtfelder und die rechtlichen Hinweise prüfen.");
          }
          const fd = new FormData(form);
          const res = await fetch("/api/checkout/paypal/create-order", {
            method: "POST",
            body: fd,
          });
          const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            paypalOrderId?: string;
            orderNumber?: string;
            error?: string;
          };
          if (res.status === 409 && data.orderNumber) {
            router.push(`/checkout/erfolg?nr=${encodeURIComponent(data.orderNumber)}`);
            throw new Error("Bereits abgeschlossen.");
          }
          if (!res.ok || !data.paypalOrderId) {
            throw new Error(data.error ?? "Bestellung konnte nicht gestartet werden.");
          }
          return data.paypalOrderId;
        },
        onApprove: async (data) => {
          const res = await fetch("/api/checkout/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: data.orderID }),
          });
          const j = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            orderNumber?: string;
            redirectUrl?: string;
          };
          if (!res.ok || !j.ok) {
            throw new Error("Zahlung konnte nicht abgeschlossen werden.");
          }
          const dest =
            j.redirectUrl ?? `/checkout/erfolg?nr=${encodeURIComponent(j.orderNumber ?? "")}`;
          router.push(dest);
        },
        onError: (err) => {
          console.error(err);
          setSdkError("Die Kartenzahlung ist fehlgeschlagen. Bitte erneut versuchen.");
        },
        onCancel: () => {
          setSdkError("Die Prüfung wurde abgebrochen. Sie wurden nicht belastet.");
        },
      });

      if (!cardFields.isEligible()) {
        setEligibility("ineligible");
        return;
      }

      cardFieldsRef.current = cardFields;
      fieldControlsRef.current = [];

      const mountField = async (factory: () => FieldControl, el: HTMLElement | null) => {
        if (!el || cancelled) return;
        el.innerHTML = "";
        const ctrl = factory();
        fieldControlsRef.current.push(ctrl);
        await ctrl.render(el);
      };

      void (async () => {
        try {
          clearMountHosts();
          if (cancelled) return;

          await mountField(
            () => cardFields.NameField({ placeholder: "Name wie auf der Karte", style: cardFieldStyle }),
            nameRef.current,
          );
          if (cancelled) return;
          await mountField(
            () =>
              cardFields.NumberField({
                placeholder: "Kartennummer",
                style: cardFieldStyle,
              }),
            numberRef.current,
          );
          if (cancelled) return;
          await mountField(
            () =>
              cardFields.ExpiryField({
                placeholder: "MM / YY",
                style: cardFieldStyle,
              }),
            expiryRef.current,
          );
          if (cancelled) return;
          await mountField(
            () =>
              cardFields.CVVField({
                placeholder: "Prüfziffer",
                style: cardFieldStyle,
              }),
            cvvRef.current,
          );
          if (cancelled) return;
          setEligibility("eligible");
          notifyEligible(true);
        } catch (e) {
          if (!cancelled) {
            setSdkError(e instanceof Error ? e.message : "Kartenfelder konnten nicht geladen werden.");
            setEligibility("ineligible");
          }
        }
      })();
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && window.paypal?.CardFields) {
      mount();
    } else if (existing && !window.paypal?.CardFields) {
      existing.addEventListener("load", mount, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = paypalCardSdkSrc(paypalClientId.trim(), currency);
      script.async = true;
      script.onload = () => mount();
      script.onerror = () => {
        setSdkError("PayPal-Skript konnte nicht geladen werden.");
        setEligibility("ineligible");
      };
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      for (const c of fieldControlsRef.current) {
        c.close?.();
      }
      fieldControlsRef.current = [];
      cardFieldsRef.current = null;
      notifyEligible(false);
      clearMountHosts();
    };
  }, [currency, formId, notifyEligible, paypalClientId, router]);

  const handlePay = async () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form?.reportValidity()) return;

    const cf = cardFieldsRef.current;
    if (!cf) return;

    setBusy(true);
    setSdkError(null);
    try {
      const state = await cf.getState();
      if (!state?.isFormValid) {
        setSdkError("Bitte Kartenangaben vollständig und korrekt ausfüllen.");
        return;
      }
      await cf.submit();
    } catch (e) {
      setSdkError(e instanceof Error ? e.message : "Zahlung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  if (!paypalClientId.trim()) {
    return null;
  }

  if (eligibility === "ineligible") {
    return null;
  }

  const showSkeleton = eligibility === "loading";

  return (
    <div className="mt-4 max-w-lg space-y-4" aria-busy={showSkeleton}>
      {showSkeleton ? (
        <span className="sr-only">Kartenfelder werden geladen.</span>
      ) : null}
      <div className="relative">
        {showSkeleton ? <CardFieldsSkeletonOverlay /> : null}
        <div
          className={
            showSkeleton
              ? "pointer-events-none space-y-3 select-none opacity-0"
              : "pointer-events-auto space-y-3 opacity-100 transition-opacity duration-200"
          }
        >
          <div>
            <label className="mb-1 block text-sm text-[#6b7280]">Karteninhaber</label>
            <div ref={nameRef} className={CHECKOUT_FIELD_SHELL} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280]">Kartennummer</label>
            <div ref={numberRef} className={CHECKOUT_FIELD_SHELL} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-[#6b7280]">Gültig bis</label>
              <div ref={expiryRef} className={CHECKOUT_FIELD_SHELL} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#6b7280]">Sicherheitscode</label>
              <div ref={cvvRef} className={CHECKOUT_FIELD_SHELL} />
            </div>
          </div>
        </div>
      </div>

      {sdkError ? (
        <p className="text-sm text-red-600" role="alert">
          {sdkError}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-[#6b7280]">
        Kartendaten werden von PayPal verarbeitet (PCI-konform). Weitere Zahlungswege (PayPal-Guthaben, Apple Pay,
        Google Pay, SEPA) können angezeigt werden, wenn Ihr Konto und das Gerät das unterstützen.
      </p>

      <button
        type="button"
        disabled={busy || eligibility !== "eligible"}
        aria-busy={busy}
        onClick={() => void handlePay()}
        className="w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50"
      >
        {busy ? "Wird verarbeitet…" : "Jetzt kostenpflichtig bestellen"}
      </button>
    </div>
  );
}
