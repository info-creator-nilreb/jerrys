"use client";

import { CHECKOUT_FIELD_SHELL } from "@/lib/checkout/checkout-field-shell";
import {
  PAYPAL_CARD_FIELDS_SCRIPT_ID,
  PAYPAL_CARD_FIELDS_VAULT_SCRIPT_ID,
  paypalCardFieldsSdkSrc,
} from "@/lib/payments/paypal-card-fields-sdk";
import {
  formatPayPalVaultedCardLabel,
  type PayPalVaultedCard,
} from "@/lib/payments/paypal-vaulted-cards";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Parent-Checkout löst denselben Card-Fields-Submit aus wie der interne Bestellbutton. */
export type PayPalCardFieldsSubmitRef = {
  current: (() => Promise<void>) | null;
};

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

type Eligibility = "loading" | "eligible" | "ineligible";

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
  onBusyChange,
  hidePayButton = false,
  submitRef,
  nested = false,
  className,
  userIdToken = null,
  vaultedCards = [],
  customerLoggedIn = false,
}: {
  formId: string;
  paypalClientId: string;
  currency: string;
  /** `true` nur bei nutzbaren Card Fields (klassischer Form-Submit wird dann ausgeblendet). */
  onEligibleChange?: (eligible: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
  /** true = Bestellbutton bleibt im Checkout-Formular (nach AGB), nicht in diesem Block. */
  hidePayButton?: boolean;
  submitRef?: PayPalCardFieldsSubmitRef;
  /** Unter der Karten-Option in der Zahlungsliste (Rahmen/Innenabstand). */
  nested?: boolean;
  className?: string;
  /** PayPal User-ID-Token, damit Card Fields hinterlegte Händler-Karten erkennen. */
  userIdToken?: string | null;
  vaultedCards?: PayPalVaultedCard[];
  customerLoggedIn?: boolean;
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
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const selectedVaultIdRef = useRef(selectedVaultId);
  selectedVaultIdRef.current = selectedVaultId;

  const setBusyState = useCallback(
    (next: boolean) => {
      setBusy(next);
      onBusyChange?.(next);
    },
    [onBusyChange],
  );

  const notifyEligible = useCallback(
    (eligible: boolean) => {
      onEligibleChange?.(eligible);
    },
    [onEligibleChange],
  );

  useEffect(() => {
    if (selectedVaultId && !vaultedCards.some((c) => c.id === selectedVaultId)) {
      setSelectedVaultId("");
    }
  }, [selectedVaultId, vaultedCards]);

  useEffect(() => {
    if (vaultedCards.length > 0) {
      notifyEligible(true);
    }
  }, [notifyEligible, vaultedCards.length]);

  useEffect(() => {
    setEligibility("loading");
    setSdkError(null);

    if (!paypalClientId.trim()) {
      setEligibility("ineligible");
      if (vaultedCards.length > 0) notifyEligible(true);
      return;
    }

    const wantedToken = userIdToken?.trim() ?? "";
    const scriptId = wantedToken ? PAYPAL_CARD_FIELDS_VAULT_SCRIPT_ID : PAYPAL_CARD_FIELDS_SCRIPT_ID;
    let cancelled = false;

    const clearMountHosts = () => {
      for (const r of [nameRef, numberRef, expiryRef, cvvRef]) {
        if (r.current) r.current.innerHTML = "";
      }
    };

    const markIneligible = () => {
      setEligibility("ineligible");
      if (vaultedCards.length > 0) notifyEligible(true);
    };

    const mount = () => {
      const paypal = window.paypal;
      if (!paypal || cancelled) return;
      if (typeof paypal.CardFields !== "function") {
        setSdkError("PayPal Card Fields sind in dieser Umgebung nicht verfügbar.");
        markIneligible();
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
          fd.delete("paypalVaultId");
          fd.set("checkoutPayPalSurface", "card");
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
            error?: string;
          };
          if (!res.ok || !j.ok) {
            throw new Error(j.error ?? "Zahlung konnte nicht abgeschlossen werden.");
          }
          const dest =
            j.redirectUrl ?? `/checkout/erfolg?nr=${encodeURIComponent(j.orderNumber ?? "")}`;
          router.push(dest);
        },
        onError: (err) => {
          console.error(err);
          setSdkError("Die Kartenzahlung ist fehlgeschlagen. Es wurde nichts abgebucht. Bitte erneut versuchen.");
        },
        onCancel: () => {
          setSdkError("Die Prüfung wurde abgebrochen. Sie wurden nicht belastet.");
        },
      });

      if (!cardFields.isEligible()) {
        markIneligible();
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
            markIneligible();
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
      script.src = paypalCardFieldsSdkSrc(paypalClientId.trim(), currency);
      if (wantedToken) {
        script.setAttribute("data-user-id-token", wantedToken);
      }
      script.async = true;
      script.onload = () => mount();
      script.onerror = () => {
        setSdkError("PayPal-Skript konnte nicht geladen werden.");
        markIneligible();
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
      if (vaultedCards.length === 0) notifyEligible(false);
      clearMountHosts();
    };
  }, [currency, formId, notifyEligible, paypalClientId, router, userIdToken, vaultedCards.length]);

  const payWithVaultedCard = async (vaultId: string) => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form?.reportValidity()) return;

    setBusyState(true);
    setSdkError(null);
    try {
      const fd = new FormData(form);
      fd.set("paypalVaultId", vaultId);
      fd.set("checkoutPayPalSurface", "card");
      const res = await fetch("/api/checkout/paypal/create-order", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        paypalOrderId?: string;
        orderNumber?: string;
        payerActionUrl?: string;
        error?: string;
      };
      if (res.status === 409 && data.orderNumber) {
        router.push(`/checkout/erfolg?nr=${encodeURIComponent(data.orderNumber)}`);
        return;
      }
      if (!res.ok || !data.paypalOrderId) {
        throw new Error(data.error ?? "Bestellung konnte nicht gestartet werden.");
      }
      if (data.payerActionUrl) {
        window.location.assign(data.payerActionUrl);
        return;
      }
      const cap = await fetch("/api/checkout/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId: data.paypalOrderId }),
      });
      const j = (await cap.json().catch(() => ({}))) as {
        ok?: boolean;
        orderNumber?: string;
        redirectUrl?: string;
        error?: string;
      };
      if (!cap.ok || !j.ok) {
        throw new Error(j.error ?? "Zahlung konnte nicht abgeschlossen werden.");
      }
      const dest = j.redirectUrl ?? `/checkout/erfolg?nr=${encodeURIComponent(j.orderNumber ?? "")}`;
      router.push(dest);
    } catch (e) {
      setSdkError(e instanceof Error ? e.message : "Zahlung fehlgeschlagen.");
    } finally {
      setBusyState(false);
    }
  };

  const handlePay = async () => {
    const vaultId = selectedVaultIdRef.current.trim();
    if (vaultId) {
      await payWithVaultedCard(vaultId);
      return;
    }

    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form?.reportValidity()) return;

    const cf = cardFieldsRef.current;
    if (!cf) return;

    setBusyState(true);
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
      setBusyState(false);
    }
  };

  const handlePayRef = useRef(handlePay);
  handlePayRef.current = handlePay;

  useEffect(() => {
    if (!submitRef) return;
    submitRef.current = () => handlePayRef.current();
    return () => {
      submitRef.current = null;
    };
  }, [submitRef]);

  useEffect(() => {
    return () => onBusyChange?.(false);
  }, [onBusyChange]);

  if (!paypalClientId.trim()) {
    return null;
  }

  if (eligibility === "ineligible" && vaultedCards.length === 0) {
    return null;
  }

  const showNewCardFields = !selectedVaultId;
  const showSkeleton = showNewCardFields && eligibility === "loading";
  const canPay = Boolean(selectedVaultId) || eligibility === "eligible";
  const layoutClass = [
    nested ? "relative border-t border-[#e5e7eb] px-3 py-3" : "relative mt-4 max-w-lg",
    "space-y-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const helperText = vaultedCards.length
    ? "Wählen Sie eine gespeicherte Karte oder geben Sie eine neue ein. Kartendaten werden von PayPal verarbeitet (PCI-konform)."
    : customerLoggedIn
      ? "Nach der ersten erfolgreichen Kartenzahlung merken wir uns die Karte für Ihren nächsten Einkauf. Kartendaten werden von PayPal verarbeitet (PCI-konform). Im Browser gespeicherte Karten können in diesen Feldern nicht automatisch eingesetzt werden."
      : "Kartendaten werden von PayPal verarbeitet (PCI-konform). Im Browser oder PayPal-Konto gespeicherte Karten erscheinen hier nicht. Für Karten in Ihrem PayPal-Konto wählen Sie die Zahlungsart PayPal.";

  return (
    <div id="checkout-card-fields" className={layoutClass} aria-busy={showSkeleton}>
      {showSkeleton ? (
        <span className="sr-only">Kartenfelder werden geladen.</span>
      ) : null}

      {vaultedCards.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm text-[#6b7280]">Gespeicherte Karten</legend>
          {vaultedCards.map((card) => {
            const label = formatPayPalVaultedCardLabel(card);
            return (
              <label
                key={card.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2937]"
              >
                <input
                  type="radio"
                  name="paypalVaultId"
                  value={card.id}
                  checked={selectedVaultId === card.id}
                  onChange={() => setSelectedVaultId(card.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span>{label}</span>
              </label>
            );
          })}
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1f2937]">
            <input
              type="radio"
              name="paypalVaultId"
              value=""
              checked={selectedVaultId === ""}
              onChange={() => setSelectedVaultId("")}
              className="size-4 shrink-0 accent-primary"
            />
            <span>Neue Karte verwenden</span>
          </label>
        </fieldset>
      ) : null}

      <div
        className={
          showNewCardFields
            ? "relative"
            : "pointer-events-none absolute h-0 overflow-hidden opacity-0"
        }
        aria-hidden={!showNewCardFields}
      >
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

      <p className="text-xs leading-relaxed text-[#6b7280]">{helperText}</p>

      {hidePayButton ? null : (
        <button
          type="button"
          disabled={busy || !canPay}
          aria-busy={busy}
          onClick={() => void handlePay()}
          className="w-full rounded-md bg-primary py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50"
        >
          {busy ? "Wird verarbeitet…" : "Jetzt kostenpflichtig bestellen"}
        </button>
      )}
    </div>
  );
}
