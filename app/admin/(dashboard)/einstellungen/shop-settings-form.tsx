"use client";

import { useActionState, useMemo, useState } from "react";
import {
  saveShopSettingsAction,
  type ShopSettingsFormState,
} from "@/app/admin/(dashboard)/einstellungen/actions";
import { BrandingAssetsSection } from "@/app/admin/(dashboard)/einstellungen/branding-assets-section";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";
import { evaluatePrimaryBrandContrast } from "@/lib/shop/color-contrast";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings";

const initial: ShopSettingsFormState = null;

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const labelClass = "text-xs font-medium text-[#6b7280]";

const saveBtnClass =
  "shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

type Props = {
  defaults: ShopSettingsDTO;
};

export function ShopSettingsForm({ defaults }: Props) {
  const [state, formAction, pending] = useActionState(saveShopSettingsAction, initial);
  const [shopName, setShopName] = useState(defaults.shopName);
  const [primaryColor, setPrimaryColor] = useState(defaults.primaryColor);
  const [primaryHoverColor, setPrimaryHoverColor] = useState(defaults.primaryHoverColor);

  const fe = state?.fieldErrors ?? {};
  const logoPreview = resolveShopBrandingAssetUrl(defaults, "logoLight");

  const liveContrast = useMemo(
    () => evaluatePrimaryBrandContrast(primaryColor),
    [primaryColor],
  );

  return (
    <div className="space-y-8">
      <section
        className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm"
        aria-label="Vorschau"
      >
        <h2 className="text-base font-semibold text-[#1f2937]">Vorschau</h2>
        <p className="mt-2 text-xs text-[#6b7280]">
          Zeigt den aktuellen Serverzustand für Logo und die live bearbeiteten Farben/Namen (noch nicht
          gespeichert).
        </p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau inkl. SVG/ICO */}
          <img
            src={logoPreview}
            alt=""
            className="h-12 w-auto max-w-[10rem] object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[#1f2937]">{shopName || "—"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Primäraktion
              </button>
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryHoverColor }}
              >
                Hover
              </button>
              <a href="#farben" className="text-sm font-medium underline-offset-2 hover:underline" style={{ color: primaryColor }}>
                Beispiel-Link
              </a>
            </div>
          </div>
        </div>
      </section>

      <form action={formAction} className="space-y-8">
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Identität</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="shopName" className={labelClass}>
                Shopname <span className="text-primary">*</span>
              </label>
              <input
                id="shopName"
                name="shopName"
                required
                maxLength={80}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.shopName} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="shortDescription" className={labelClass}>
                Kurzbeschreibung
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                rows={3}
                maxLength={500}
                defaultValue={defaults.shortDescription ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.shortDescription} />
            </div>
            <div>
              <label htmlFor="emailFromName" className={labelClass}>
                E-Mail-Absendername
              </label>
              <input
                id="emailFromName"
                name="emailFromName"
                maxLength={80}
                defaultValue={defaults.emailFromName ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.emailFromName} />
            </div>
          </div>
        </section>

        <section id="farben" className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Farben</h2>
          <p className="mt-2 text-xs text-[#6b7280]">
            Nur <code className="rounded bg-[#f3f4f6] px-1">#RRGGBB</code> — keine freie CSS-Eingabe.
            Kontrastwarnungen blockieren das Speichern nicht (Baseline-Markengrün bleibt möglich).
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="primaryColor" className={labelClass}>
                Primärfarbe <span className="text-primary">*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Primärfarbe wählen"
                  value={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#8bbe25"}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-11 cursor-pointer rounded border border-[#d2d5d9] bg-white p-1"
                />
                <input
                  id="primaryColor"
                  name="primaryColor"
                  required
                  pattern="#[0-9A-Fa-f]{6}"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className={inputClass}
                />
              </div>
              <FieldError message={fe.primaryColor} />
            </div>
            <div>
              <label htmlFor="primaryHoverColor" className={labelClass}>
                Hover-/Fokusfarbe <span className="text-primary">*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Hoverfarbe wählen"
                  value={/^#[0-9a-fA-F]{6}$/.test(primaryHoverColor) ? primaryHoverColor : "#74a320"}
                  onChange={(e) => setPrimaryHoverColor(e.target.value)}
                  className="size-11 cursor-pointer rounded border border-[#d2d5d9] bg-white p-1"
                />
                <input
                  id="primaryHoverColor"
                  name="primaryHoverColor"
                  required
                  pattern="#[0-9A-Fa-f]{6}"
                  value={primaryHoverColor}
                  onChange={(e) => setPrimaryHoverColor(e.target.value)}
                  className={inputClass}
                />
              </div>
              <FieldError message={fe.primaryHoverColor} />
            </div>
          </div>
          {liveContrast && liveContrast.warnings.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              {liveContrast.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Kontakt</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contactEmail" className={labelClass}>
                Kontakt-E-Mail
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={defaults.contactEmail ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.contactEmail} />
            </div>
            <div>
              <label htmlFor="supportEmail" className={labelClass}>
                Support-E-Mail
              </label>
              <input
                id="supportEmail"
                name="supportEmail"
                type="email"
                defaultValue={defaults.supportEmail ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.supportEmail} />
            </div>
            <div>
              <label htmlFor="contactPhone" className={labelClass}>
                Telefon
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                defaultValue={defaults.contactPhone ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.contactPhone} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Geschäftsanschrift</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="legalName" className={labelClass}>
                Rechtlicher Name
              </label>
              <input
                id="legalName"
                name="legalName"
                defaultValue={defaults.legalName ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.legalName} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine1" className={labelClass}>
                Straße und Hausnummer
              </label>
              <input
                id="addressLine1"
                name="addressLine1"
                defaultValue={defaults.addressLine1 ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.addressLine1} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine2" className={labelClass}>
                Adresszusatz
              </label>
              <input
                id="addressLine2"
                name="addressLine2"
                defaultValue={defaults.addressLine2 ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.addressLine2} />
            </div>
            <div>
              <label htmlFor="addressZip" className={labelClass}>
                PLZ
              </label>
              <input
                id="addressZip"
                name="addressZip"
                defaultValue={defaults.addressZip ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.addressZip} />
            </div>
            <div>
              <label htmlFor="addressCity" className={labelClass}>
                Ort
              </label>
              <input
                id="addressCity"
                name="addressCity"
                defaultValue={defaults.addressCity ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.addressCity} />
            </div>
            <div>
              <label htmlFor="addressCountry" className={labelClass}>
                Land (ISO-2)
              </label>
              <input
                id="addressCountry"
                name="addressCountry"
                maxLength={2}
                defaultValue={defaults.addressCountry || "DE"}
                className={`${inputClass} mt-1 uppercase`}
              />
              <FieldError message={fe.addressCountry} />
            </div>
            <div>
              <label htmlFor="vatId" className={labelClass}>
                USt-IdNr.
              </label>
              <input
                id="vatId"
                name="vatId"
                defaultValue={defaults.vatId ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.vatId} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Social Links</h2>
          <p className="mt-2 text-xs text-[#6b7280]">Nur HTTPS-URLs.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="instagramUrl" className={labelClass}>
                Instagram
              </label>
              <input
                id="instagramUrl"
                name="instagramUrl"
                type="url"
                placeholder="https://"
                defaultValue={defaults.instagramUrl ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.instagramUrl} />
            </div>
            <div>
              <label htmlFor="facebookUrl" className={labelClass}>
                Facebook
              </label>
              <input
                id="facebookUrl"
                name="facebookUrl"
                type="url"
                placeholder="https://"
                defaultValue={defaults.facebookUrl ?? ""}
                className={`${inputClass} mt-1`}
              />
              <FieldError message={fe.facebookUrl} />
            </div>
          </div>
        </section>

        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <div className="space-y-2" role="status">
            <p className="text-sm font-medium text-primary">Gespeichert.</p>
            {state.contrastWarnings && state.contrastWarnings.length > 0 ? (
              <ul className="list-disc space-y-1 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {state.contrastWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <AdminFormActionDock>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="submit" disabled={pending} className={saveBtnClass}>
              {pending ? "Speichern …" : "Speichern"}
            </button>
          </div>
        </AdminFormActionDock>
      </form>

      <BrandingAssetsSection settings={defaults} />
    </div>
  );
}
