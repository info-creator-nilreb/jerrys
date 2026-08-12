"use client";

import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import {
  saveShopSettingsAction,
  type ShopSettingsFormState,
} from "@/app/admin/(dashboard)/einstellungen/actions";
import {
  CoverImageSection,
  LogosSection,
} from "@/app/admin/(dashboard)/einstellungen/branding-assets-section";
import { evaluatePrimaryBrandContrast } from "@/lib/shop/color-contrast";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";

const initial: ShopSettingsFormState = null;

const inputClass =
  "w-full rounded-lg border border-[#d2d5d9] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const saveBtnClass =
  "shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50";

const removeLinkClass =
  "text-sm font-medium text-[#b42318] transition-colors hover:text-[#912018] disabled:text-[#9ca3af]";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-sm text-[#b42318]" role="alert">
      {message}
    </p>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-[#1f2937]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[#6b7280]">{description}</p> : null}
      <div className={description ? "mt-4" : "mt-5"}>{children}</div>
    </section>
  );
}

function ColorRow({
  label,
  name,
  value,
  onChange,
  onRemove,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  error?: string;
}) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#8bbe25";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-3">
        <label className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#d2d5d9] shadow-sm">
          <span className="absolute inset-0" style={{ backgroundColor: hex }} aria-hidden />
          <input
            type="color"
            aria-label={`${label} wählen`}
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#1f2937]">{label}</p>
          <input
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            pattern="#[0-9A-Fa-f]{6}"
            required
            aria-label={`${label} Hex`}
            className="mt-0.5 w-full border-0 bg-transparent p-0 font-mono text-sm text-[#6b7280] outline-none focus:text-[#1f2937]"
          />
        </div>
        {onRemove ? (
          <button type="button" onClick={onRemove} className={removeLinkClass}>
            Entfernen
          </button>
        ) : null}
      </div>
      <FieldError message={error} />
    </div>
  );
}

type Props = {
  defaults: ShopSettingsDTO;
};

export function ShopSettingsForm({ defaults }: Props) {
  const [state, formAction, pending] = useActionState(saveShopSettingsAction, initial);
  const [shopName, setShopName] = useState(defaults.shopName);
  const [shortDescription, setShortDescription] = useState(defaults.shortDescription ?? "");
  const [primaryColor, setPrimaryColor] = useState(defaults.primaryColor);
  const [primaryHoverColor, setPrimaryHoverColor] = useState(defaults.primaryHoverColor);
  const [instagramUrl, setInstagramUrl] = useState(defaults.instagramUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(defaults.facebookUrl ?? "");

  const fe = state?.fieldErrors ?? {};
  const liveContrast = useMemo(
    () => evaluatePrimaryBrandContrast(primaryColor),
    [primaryColor],
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <LogosSection settings={defaults} />
      <CoverImageSection settings={defaults} />

      <form action={formAction} className="space-y-4 sm:space-y-5">
        <SettingsCard
          title="Farben"
          description="Die Markenfarben, die in deinem Shop, in E-Mails und im Admin erscheinen"
        >
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#1f2937]">Primär</p>
            <ColorRow
              label="Primärfarbe"
              name="primaryColor"
              value={primaryColor}
              onChange={setPrimaryColor}
              onRemove={() => setPrimaryColor(JERRYS_SHOP_SETTINGS_DEFAULTS.primaryColor)}
              error={fe.primaryColor}
            />
            <ColorRow
              label="Hover-/Fokusfarbe"
              name="primaryHoverColor"
              value={primaryHoverColor}
              onChange={setPrimaryHoverColor}
              onRemove={() => setPrimaryHoverColor(JERRYS_SHOP_SETTINGS_DEFAULTS.primaryHoverColor)}
              error={fe.primaryHoverColor}
            />
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-3">
              <span
                className="size-12 shrink-0 rounded-lg border border-[#d2d5d9] bg-white shadow-sm"
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium text-[#1f2937]">Kontrastfarbe</p>
                <p className="font-mono text-sm text-[#6b7280]">#ffffff</p>
              </div>
              <p className="w-full text-xs text-[#6b7280] sm:ml-auto sm:w-auto">
                Fest für Button-Text auf Primärflächen
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
                style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#8bbe25" }}
              >
                Primäraktion
              </span>
              <span
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
                style={{
                  backgroundColor: /^#[0-9a-fA-F]{6}$/.test(primaryHoverColor)
                    ? primaryHoverColor
                    : "#74a320",
                }}
              >
                Hover
              </span>
            </div>
            {liveContrast && liveContrast.warnings.length > 0 ? (
              <div
                className="rounded-lg border border-[#f3e0b5] bg-[#fff8e6] px-3 py-3 text-sm text-[#5c4b1f]"
                role="status"
              >
                <p className="font-medium">Kontrast-Hinweis</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {liveContrast.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Shopname"
          description="Name deiner Marke in Shop, Admin und Metadaten"
        >
          <div className="relative">
            <input
              id="shopName"
              name="shopName"
              required
              maxLength={80}
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className={inputClass}
            />
            <p className="pointer-events-none absolute right-3 bottom-2.5 text-xs text-[#9ca3af]">
              {shopName.length}/80
            </p>
          </div>
          <FieldError message={fe.shopName} />
        </SettingsCard>

        <SettingsCard
          title="Hauptnavigation"
          description="Wie bei Shopify: Kategorien bilden das Menü. Zusätzliche Systemlinks kannst du ein- oder ausblenden."
        >
          <div className="space-y-3">
            <p className="text-sm text-[#6b7280]">
              Aktive Hauptkategorien mit Produkten erscheinen automatisch im Header (Reihenfolge über{" "}
              <Link href="/admin/categories" className="font-medium text-primary hover:underline">
                Katalog → Kategorien
              </Link>
              , Feld Sortierung).
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]">
              <input type="hidden" name="showAllProductsInNav" value="false" />
              <input
                type="checkbox"
                name="showAllProductsInNav"
                value="true"
                defaultChecked={defaults.showAllProductsInNav}
                className="checkbox-primary mt-0.5 size-4"
              />
              <span>
                <span className="font-medium">„Alle Produkte“ anzeigen</span>
                <span className="mt-0.5 block text-xs text-[#6b7280]">
                  Link zur Katalogübersicht (/produkte)
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]">
              <input type="hidden" name="showTermineInNav" value="false" />
              <input
                type="checkbox"
                name="showTermineInNav"
                value="true"
                defaultChecked={defaults.showTermineInNav}
                className="checkbox-primary mt-0.5 size-4"
              />
              <span>
                <span className="font-medium">„Termine“ anzeigen</span>
                <span className="mt-0.5 block text-xs text-[#6b7280]">
                  Link zum Gruppenkalender (/termine)
                </span>
              </span>
            </label>

            <fieldset className="mt-4 space-y-2 border-t border-[#e8eaed] pt-4">
              <legend className="text-sm font-medium text-[#1f2937]">Desktop-Darstellung</legend>
              <p className="text-xs text-[#6b7280]">
                Auf schlanken Markenseiten kannst du das Desktop-Menü ausblenden. Mobil bleibt der
                Burger, sobald Links vorhanden sind.
              </p>
              {(
                [
                  {
                    value: "inline",
                    title: "Sichtbar im Header",
                    hint: "Klassische Linkzeile neben dem Logo (bisheriges Verhalten)",
                  },
                  {
                    value: "burger",
                    title: "Als Burger-Menü",
                    hint: "Auch auf Desktop nur über das Menü-Icon öffnen",
                  },
                  {
                    value: "hidden",
                    title: "Kein Menü auf Desktop",
                    hint: "Desktop ohne Shop-Nav; Mobil weiterhin Burger",
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]"
                >
                  <input
                    type="radio"
                    name="desktopShopNavMode"
                    value={opt.value}
                    defaultChecked={defaults.desktopShopNavMode === opt.value}
                    className="mt-1 size-3.5 accent-primary"
                  />
                  <span>
                    <span className="font-medium">{opt.title}</span>
                    <span className="mt-0.5 block text-xs text-[#6b7280]">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Kurzbeschreibung"
          description="Beschreibung deines Unternehmens, oft in Biografien und Angeboten verwendet"
        >
          <div className="relative">
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={4}
              maxLength={500}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className={`${inputClass} resize-y pb-7`}
            />
            <p className="pointer-events-none absolute right-3 bottom-2.5 text-xs text-[#9ca3af]">
              {shortDescription.length}/500
            </p>
          </div>
          <FieldError message={fe.shortDescription} />
        </SettingsCard>

        <SettingsCard
          title="Social-Media-Links"
          description="Social-Media-Links für dein Unternehmen, oft in der Theme-Fußzeile verwendet"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="instagramUrl" className="text-sm font-medium text-[#1f2937]">
                Instagram
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Instagram
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6b7280]"
                    aria-hidden
                    strokeWidth={1.75}
                  />
                  <input
                    id="instagramUrl"
                    name="instagramUrl"
                    type="url"
                    placeholder="https://instagram.com/…"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <button
                  type="button"
                  className={`${removeLinkClass} self-start sm:self-center`}
                  onClick={() => setInstagramUrl("")}
                  disabled={!instagramUrl}
                >
                  Entfernen
                </button>
              </div>
              <p className="mt-1 text-xs text-[#9ca3af]">https://instagram.com/shop</p>
              <FieldError message={fe.instagramUrl} />
            </div>

            <div>
              <label htmlFor="facebookUrl" className="text-sm font-medium text-[#1f2937]">
                Facebook
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Facebook
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6b7280]"
                    aria-hidden
                    strokeWidth={1.75}
                  />
                  <input
                    id="facebookUrl"
                    name="facebookUrl"
                    type="url"
                    placeholder="https://facebook.com/…"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <button
                  type="button"
                  className={`${removeLinkClass} self-start sm:self-center`}
                  onClick={() => setFacebookUrl("")}
                  disabled={!facebookUrl}
                >
                  Entfernen
                </button>
              </div>
              <p className="mt-1 text-xs text-[#9ca3af]">https://facebook.com/shop</p>
              <FieldError message={fe.facebookUrl} />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Kontakt & Geschäftsangaben"
          description="Öffentliche Kontaktdaten und Anschrift für Impressum, E-Mail und Rechnungen"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="emailFromName" className="text-sm font-medium text-[#1f2937]">
                E-Mail-Absendername
              </label>
              <input
                id="emailFromName"
                name="emailFromName"
                maxLength={80}
                defaultValue={defaults.emailFromName ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.emailFromName} />
            </div>
            <div>
              <label htmlFor="contactEmail" className="text-sm font-medium text-[#1f2937]">
                Kontakt-E-Mail
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={defaults.contactEmail ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.contactEmail} />
            </div>
            <div>
              <label htmlFor="supportEmail" className="text-sm font-medium text-[#1f2937]">
                Support-E-Mail
              </label>
              <input
                id="supportEmail"
                name="supportEmail"
                type="email"
                defaultValue={defaults.supportEmail ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.supportEmail} />
            </div>
            <div>
              <label htmlFor="contactPhone" className="text-sm font-medium text-[#1f2937]">
                Telefon
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                defaultValue={defaults.contactPhone ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.contactPhone} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="legalName" className="text-sm font-medium text-[#1f2937]">
                Rechtlicher Name
              </label>
              <input
                id="legalName"
                name="legalName"
                defaultValue={defaults.legalName ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.legalName} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine1" className="text-sm font-medium text-[#1f2937]">
                Straße und Hausnummer
              </label>
              <input
                id="addressLine1"
                name="addressLine1"
                defaultValue={defaults.addressLine1 ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.addressLine1} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine2" className="text-sm font-medium text-[#1f2937]">
                Adresszusatz
              </label>
              <input
                id="addressLine2"
                name="addressLine2"
                defaultValue={defaults.addressLine2 ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.addressLine2} />
            </div>
            <div>
              <label htmlFor="addressZip" className="text-sm font-medium text-[#1f2937]">
                PLZ
              </label>
              <input
                id="addressZip"
                name="addressZip"
                defaultValue={defaults.addressZip ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.addressZip} />
            </div>
            <div>
              <label htmlFor="addressCity" className="text-sm font-medium text-[#1f2937]">
                Ort
              </label>
              <input
                id="addressCity"
                name="addressCity"
                defaultValue={defaults.addressCity ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.addressCity} />
            </div>
            <div>
              <label htmlFor="addressCountry" className="text-sm font-medium text-[#1f2937]">
                Land (ISO-2)
              </label>
              <input
                id="addressCountry"
                name="addressCountry"
                maxLength={2}
                defaultValue={defaults.addressCountry || "DE"}
                className={`${inputClass} mt-1.5 uppercase`}
              />
              <FieldError message={fe.addressCountry} />
            </div>
            <div>
              <label htmlFor="vatId" className="text-sm font-medium text-[#1f2937]">
                USt-IdNr.
              </label>
              <input
                id="vatId"
                name="vatId"
                defaultValue={defaults.vatId ?? ""}
                className={`${inputClass} mt-1.5`}
              />
              <FieldError message={fe.vatId} />
            </div>
          </div>
        </SettingsCard>

        {state?.error ? (
          <p className="text-sm text-[#b42318]" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <div className="space-y-2" role="status">
            <p className="text-sm font-medium text-primary">Gespeichert.</p>
            {state.contrastWarnings && state.contrastWarnings.length > 0 ? (
              <div className="rounded-lg border border-[#f3e0b5] bg-[#fff8e6] px-3 py-3 text-sm text-[#5c4b1f]">
                <ul className="list-disc space-y-1 pl-4">
                  {state.contrastWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Speichern im normalen Fluss — kein fixed/sticky Dock (erzeugte Leerraum im scrollbaren main). */}
        <div className="flex justify-end border-t border-[#e8eaed] pt-4">
          <button type="submit" disabled={pending} className={saveBtnClass}>
            {pending ? "Speichern …" : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
