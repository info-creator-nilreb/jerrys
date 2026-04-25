"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import {
  generateUniquePromotionCodeAction,
  savePromotion,
  type PromotionFormState,
} from "@/app/admin/(dashboard)/promotions/actions";
import { PROMOTION_TYPES, type PromotionTypeId } from "@/lib/promotions/types";
import type { Promotion } from "@/app/generated/prisma/client";

const initial: PromotionFormState = null;

function eurosFromCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

type Props = {
  promotionType: PromotionTypeId;
  initialPromotion?: Promotion;
  /** Für Versandkostenfrei: Länder aus der Shop-Versandkonfiguration (Admin → Versand). */
  availableShippingCountryCodes: string[];
  /** Nur Anlage: Default-Datumsstrings (von der Server-Seite gesetzt). */
  defaultStartDate?: string;
  defaultEndDate?: string;
};

export function PromotionForm({
  promotionType,
  initialPromotion,
  availableShippingCountryCodes,
  defaultStartDate,
  defaultEndDate,
}: Props) {
  const [state, formAction, pending] = useActionState(savePromotion, initial);
  const [applicationMode, setApplicationMode] = useState<"automatic" | "code">(
    (initialPromotion?.applicationMode as "automatic" | "code") ?? "code",
  );
  const [discountValueType, setDiscountValueType] = useState<"percent" | "fixed">(
    (initialPromotion?.discountValueType as "percent" | "fixed") ?? "percent",
  );
  const [minReq, setMinReq] = useState<"none" | "cart_value">(
    (initialPromotion?.minimumRequirementType as "none" | "cart_value") ?? "none",
  );
  const [freeShipScope, setFreeShipScope] = useState<"all" | "allow" | "deny">(() => {
    const s = initialPromotion?.freeShippingCountryScope;
    if (s === "allow" || s === "deny") return s;
    return "all";
  });
  const [freeShipCountrySelection, setFreeShipCountrySelection] = useState<Set<string>>(() => {
    const raw = initialPromotion?.freeShippingCountryCodes ?? [];
    return new Set(
      raw.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)),
    );
  });

  const regionNamesDe = useMemo(() => new Intl.DisplayNames(["de"], { type: "region" }), []);

  const fe = state != null && state.ok === false ? state.fieldErrors : undefined;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (promotionType === "free_shipping") {
      for (const k of [...fd.keys()]) {
        if (k === "freeShippingCountryCodes") fd.delete(k);
      }
      if (freeShipScope === "allow" || freeShipScope === "deny") {
        for (const c of freeShipCountrySelection) {
          fd.append("freeShippingCountryCodes", c);
        }
      }
    }
    startTransition(() => {
      formAction(fd);
    });
  };

  const onGenerateCode = () => {
    void (async () => {
      const r = await generateUniquePromotionCodeAction();
      if (r.ok) {
        const el = document.getElementById("promotion-code-input") as HTMLInputElement | null;
        if (el) el.value = r.code;
      }
    })();
  };

  const typeLabel = PROMOTION_TYPES[promotionType];
  const isFreeShipping = promotionType === "free_shipping";
  const isCheapestItemPercent = promotionType === "cheapest_item_percent";

  return (
    <form onSubmit={onSubmit} className="w-full space-y-10">
      {initialPromotion?.id ? <input type="hidden" name="id" value={initialPromotion.id} /> : null}
      <input type="hidden" name="promotionType" value={promotionType} />

      {state?.ok === false ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Basisdaten</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm text-[#374151]">
              Titel <span className="text-primary">*</span>
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={initialPromotion?.title ?? ""}
              className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
            />
            {fe?.title ? (
              <p className="mt-1 text-sm text-red-600">{fe.title}</p>
            ) : null}
          </div>
          <div>
            <span className="block text-sm text-[#374151]">Aktionstyp</span>
            <p className="mt-1 rounded-md border border-dashed border-[#e5e7eb] bg-[#fafbfc] px-3 py-2 text-sm text-[#1f2937]">
              {typeLabel}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Einlösung</h2>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
            <input
              type="radio"
              name="applicationMode"
              value="automatic"
              checked={applicationMode === "automatic"}
              onChange={() => setApplicationMode("automatic")}
              className="size-4 text-primary"
            />
            Automatischer Abzug
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
            <input
              type="radio"
              name="applicationMode"
              value="code"
              checked={applicationMode === "code"}
              onChange={() => setApplicationMode("code")}
              className="size-4 text-primary"
            />
            Rabattcode
          </label>
        </div>

        {applicationMode === "code" ? (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="promotion-code-input" className="block text-sm text-[#374151]">
                Code
              </label>
              <input
                id="promotion-code-input"
                name="code"
                defaultValue={initialPromotion?.code ?? ""}
                className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm uppercase outline-none ring-primary focus:border-primary focus:ring-1"
                autoComplete="off"
              />
              {fe?.code ? (
                <p className="mt-1 text-sm text-red-600">{fe.code}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onGenerateCode}
              className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              Code generieren
            </button>
          </div>
        ) : (
          <input type="hidden" name="code" value="" />
        )}
      </section>

      {isFreeShipping ? (
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Versand</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Bei dieser Aktion entfallen die Versandkosten, sobald die Promotion greift (z. B. nach
            Einlösung des Codes oder bei automatischer Anwendung).
          </p>
          <input type="hidden" name="discountValueType" value="percent" />
          <input type="hidden" name="discountValuePercent" value="0" />

          <div className="mt-6 border-t border-[#e8eaed] pt-6">
            <h3 className="text-sm font-medium text-[#374151]">Lieferländer</h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              Einschränkung nur für Versandkostenfrei: entweder nur bestimmte Länder oder Ausschluss.
              Es stehen nur Länder zur Auswahl, die in der Shop-Versandkonfiguration aktiviert sind.
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
                <input
                  type="radio"
                  name="freeShippingCountryScope"
                  value="all"
                  checked={freeShipScope === "all"}
                  onChange={() => setFreeShipScope("all")}
                  className="size-4 text-primary"
                />
                Alle konfigurierten Lieferländer
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
                <input
                  type="radio"
                  name="freeShippingCountryScope"
                  value="allow"
                  checked={freeShipScope === "allow"}
                  onChange={() => setFreeShipScope("allow")}
                  className="size-4 text-primary"
                />
                Nur ausgewählte Länder
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
                <input
                  type="radio"
                  name="freeShippingCountryScope"
                  value="deny"
                  checked={freeShipScope === "deny"}
                  onChange={() => setFreeShipScope("deny")}
                  className="size-4 text-primary"
                />
                Alle außer ausgewählte Länder (Ausschluss)
              </label>
            </div>
            {freeShipScope !== "all" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {availableShippingCountryCodes.length === 0 ? (
                  <p className="text-sm text-amber-800">
                    Keine Lieferländer in der Versandkonfiguration – bitte unter Admin → Versand Länder
                    anlegen.
                  </p>
                ) : (
                  availableShippingCountryCodes.map((code) => {
                    const label = regionNamesDe.of(code) ?? code;
                    const checked = freeShipCountrySelection.has(code);
                    return (
                      <label
                        key={code}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-[#e3e4e8] bg-[#fafbfc] px-3 py-2 text-sm text-[#374151]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setFreeShipCountrySelection((prev) => {
                              const n = new Set(prev);
                              if (n.has(code)) n.delete(code);
                              else n.add(code);
                              return n;
                            });
                          }}
                          className="size-4 rounded border-[#cfd2d8] text-primary"
                        />
                        <span>
                          {code} <span className="text-[#6b7280]">({label})</span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
            {fe?.freeShippingCountryCodes ? (
              <p className="mt-2 text-sm text-red-600">{fe.freeShippingCountryCodes}</p>
            ) : null}
          </div>
        </section>
      ) : isCheapestItemPercent ? (
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Rabattwert</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Es wird nur die günstigste Warenzeile (nach Steuerlogik wie im Checkout) mit dem folgenden
            Prozentsatz rabattiert – nicht die gesamte Bestellung.
          </p>
          <input type="hidden" name="discountValueType" value="percent" />
          <div className="mt-4 max-w-xs">
            <label htmlFor="discountValuePercent" className="block text-sm text-[#374151]">
              Prozent
            </label>
            <input
              id="discountValuePercent"
              name="discountValuePercent"
              type="number"
              min={1}
              max={100}
              step={1}
              defaultValue={
                initialPromotion?.discountValueType === "percent" ? initialPromotion.discountValue : 10
              }
              className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
            />
            {fe?.discountValuePercent ? (
              <p className="mt-1 text-sm text-red-600">{fe.discountValuePercent}</p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Rabattwert</h2>
          <input type="hidden" name="discountValueType" value={discountValueType} />
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
              <input
                type="radio"
                checked={discountValueType === "percent"}
                onChange={() => setDiscountValueType("percent")}
                className="size-4 text-primary"
              />
              Prozentual
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
              <input
                type="radio"
                checked={discountValueType === "fixed"}
                onChange={() => setDiscountValueType("fixed")}
                className="size-4 text-primary"
              />
              Absolut (EUR)
            </label>
          </div>
          {discountValueType === "percent" ? (
            <div className="mt-4 max-w-xs">
              <label htmlFor="discountValuePercent" className="block text-sm text-[#374151]">
                Prozent
              </label>
              <input
                id="discountValuePercent"
                name="discountValuePercent"
                type="number"
                min={1}
                max={100}
                step={1}
                defaultValue={
                  initialPromotion?.discountValueType === "percent" ? initialPromotion.discountValue : 10
                }
                className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
              />
              {fe?.discountValuePercent ? (
                <p className="mt-1 text-sm text-red-600">{fe.discountValuePercent}</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 max-w-xs">
              <label htmlFor="discountValueEuro" className="block text-sm text-[#374151]">
                Betrag (EUR)
              </label>
              <input
                id="discountValueEuro"
                name="discountValueEuro"
                type="text"
                inputMode="decimal"
                defaultValue={
                  initialPromotion?.discountValueType === "fixed"
                    ? (initialPromotion.discountValue / 100).toFixed(2)
                    : "5.00"
                }
                className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
              />
              {fe?.discountValueEuro ? (
                <p className="mt-1 text-sm text-red-600">{fe.discountValueEuro}</p>
              ) : null}
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Mindestanforderungen</h2>
        <input type="hidden" name="minimumRequirementType" value={minReq} />
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
            <input
              type="radio"
              checked={minReq === "none"}
              onChange={() => setMinReq("none")}
              className="size-4 text-primary"
            />
            Keine
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
            <input
              type="radio"
              checked={minReq === "cart_value"}
              onChange={() => setMinReq("cart_value")}
              className="size-4 text-primary"
            />
            Mindestwarenkorbwert
          </label>
        </div>
        {minReq === "cart_value" ? (
          <div className="mt-4 max-w-xs">
            <label htmlFor="minimumCartEuro" className="block text-sm text-[#374151]">
              Mindestbetrag (EUR, brutto)
            </label>
            <input
              id="minimumCartEuro"
              name="minimumCartEuro"
              type="text"
              inputMode="decimal"
              defaultValue={eurosFromCents(initialPromotion?.minimumCartValueCents)}
              placeholder="z. B. 50,00"
              className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
            />
            {fe?.minimumCartEuro ? (
              <p className="mt-1 text-sm text-red-600">{fe.minimumCartEuro}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Zeitraum</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm text-[#374151]">
              Startdatum
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={
                initialPromotion?.startDate
                  ? initialPromotion.startDate.toISOString().slice(0, 10)
                  : (defaultStartDate ?? "")
              }
              className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
            />
            {fe?.startDate ? (
              <p className="mt-1 text-sm text-red-600">{fe.startDate}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm text-[#374151]">
              Enddatum
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={
                initialPromotion?.endDate
                  ? initialPromotion.endDate.toISOString().slice(0, 10)
                  : (defaultEndDate ?? "")
              }
              className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-1"
            />
            {fe?.endDate ? (
              <p className="mt-1 text-sm text-red-600">{fe.endDate}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">Aktivierung</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Der Status (Entwurf, Geplant, Aktiv, …) ergibt sich aus Aktivierung und Zeitraum.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-[#374151]">
          <input
            type="checkbox"
            name="promotionActiveUi"
            defaultChecked={initialPromotion?.isEnabled ?? false}
            disabled
            className="size-4 rounded border-[#d2d5d9]"
          />
          Promotion aktiv (über „Speichern“ / „Aktivieren“ in der Übersicht)
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) disabled:opacity-50"
        >
          Speichern
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-md border border-[#e3e4e8] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
        >
          Speichern als Entwurf
        </button>
        <Link
          href="/admin/promotions"
          className="rounded-md px-4 py-2.5 text-sm font-medium text-[#6b7280] hover:text-[#374151]"
        >
          Abbrechen
        </Link>
      </div>

      {!isFreeShipping ? <input type="hidden" name="freeShippingCountryScope" value="all" /> : null}
    </form>
  );
}
