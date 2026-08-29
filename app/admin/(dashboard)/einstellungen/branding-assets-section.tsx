"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  clearShopBrandingAssetAction,
  setShopBrandingAssetFromUrlAction,
  uploadShopBrandingAssetAction,
  type BrandingAssetFormState,
} from "@/app/admin/(dashboard)/einstellungen/actions";
import { listCmsMediaLibraryAction } from "@/app/admin/(dashboard)/inhalte/media-actions";
import { CmsMediaLibraryModal } from "@/components/admin/cms-media-library-modal";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import type { ShopBrandingAssetKind } from "@/lib/shop/branding-asset-kinds";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import type { CmsMediaLibraryItem } from "@/lib/content/cms-media-library";

const initial: BrandingAssetFormState = null;

type AssetMeta = {
  kind: ShopBrandingAssetKind;
  title: string;
  description: string;
  hint: string;
  accept: string;
  variant: "wide" | "square" | "cover";
};

const LOGO_ASSETS: AssetMeta[] = [
  {
    kind: "logoLight",
    title: "Standard",
    description: "Wird für die gängigsten Logo-Anwendungen verwendet",
    hint: "WEBP, SVG, PNG oder JPG. Empfohlene Breite: mindestens 512 Pixel.",
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
    variant: "wide",
  },
  {
    kind: "logoDark",
    title: "Für dunkle Flächen",
    description: "Für Footer, Admin-Sidebar und dunkle Hintergründe",
    hint: "WEBP, SVG, PNG oder JPG. Empfohlene Breite: mindestens 512 Pixel.",
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
    variant: "wide",
  },
  {
    kind: "favicon",
    title: "Favicon",
    description: "Browser-Tab und Lesezeichen",
    hint: "PNG, ICO oder SVG. Empfohlen: mindestens 512×512 Pixel.",
    accept: "image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml",
    variant: "square",
  },
];

const COVER_ASSET: AssetMeta = {
  kind: "ogImage",
  title: "Titelbild",
  description: "Wichtiges Bild für Social Sharing, Open Graph und Profilflächen",
  hint: "WEBP, PNG oder JPG. Empfohlen: mindestens 1200×630 Pixel.",
  accept: "image/png,image/jpeg,image/webp",
  variant: "cover",
};

const ADMIN_LOGIN_HERO_ASSET: AssetMeta = {
  kind: "adminLoginHero",
  title: "Admin-Login Hintergrund",
  description: "Großes Stimmungsbild links auf der Anmeldeseite (shop-spezifisch)",
  hint: "WEBP, PNG oder JPG. Empfohlen: Querformat, mindestens 1200×630 Pixel.",
  accept: "image/png,image/jpeg,image/webp",
  variant: "cover",
};

function hasCustomUrl(settings: ShopSettingsDTO, kind: ShopBrandingAssetKind): boolean {
  switch (kind) {
    case "logoLight":
      return Boolean(settings.logoLightUrl);
    case "logoDark":
      return Boolean(settings.logoDarkUrl);
    case "favicon":
      return Boolean(settings.faviconUrl);
    case "ogImage":
      return Boolean(settings.ogImageUrl);
    case "adminLoginHero":
      return Boolean(settings.adminLoginHeroUrl);
  }
}

function previewShellClass(variant: AssetMeta["variant"], dark?: boolean): string {
  const tone = dark ? "bg-[#182d4d]" : "bg-[#f1f2f3]";
  if (variant === "cover") {
    return `flex aspect-video max-h-52 w-full items-center justify-center overflow-hidden rounded-lg ${tone}`;
  }
  if (variant === "square") {
    return `flex size-28 items-center justify-center overflow-hidden rounded-lg ${tone}`;
  }
  return `flex h-28 w-full items-center justify-center overflow-hidden rounded-lg px-6 ${tone}`;
}

function AssetBlock({ meta, settings }: { meta: AssetMeta; settings: ShopSettingsDTO }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadShopBrandingAssetAction,
    initial,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearShopBrandingAssetAction,
    initial,
  );

  const url = resolveShopBrandingAssetUrl(settings, meta.kind);
  const custom = hasCustomUrl(settings, meta.kind);
  const pending = uploadPending || clearPending;
  const error =
    (uploadState?.kind === meta.kind ? uploadState.error : undefined) ??
    (clearState?.kind === meta.kind ? clearState.error : undefined);
  const ok =
    (uploadState?.kind === meta.kind && uploadState.ok) ||
    (clearState?.kind === meta.kind && clearState.ok);

  useEffect(() => {
    if (uploadState?.ok || clearState?.ok) router.refresh();
  }, [uploadState?.ok, clearState?.ok, router]);

  const darkPreview = meta.kind === "logoDark";

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[#1f2937]">{meta.title}</h3>
        <p className="mt-1 text-sm text-[#6b7280]">{meta.description}</p>
      </div>

      <div className={previewShellClass(meta.variant, darkPreview)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Branding-Vorschau inkl. SVG/ICO/Blob */}
        <img
          src={url}
          alt=""
          className={
            meta.variant === "cover"
              ? "h-full w-full object-cover"
              : meta.variant === "square"
                ? "max-h-16 max-w-16 object-contain"
                : "max-h-14 w-auto max-w-[min(100%,14rem)] object-contain"
          }
        />
      </div>

      {/* Kein display:contents — versteckte Inputs würden sonst Grid-Zeilen erzeugen */}
      <div className="flex overflow-hidden rounded-lg border border-[#d2d5d9] bg-white">
        <form action={uploadAction} className="min-w-0 flex-1">
          <input type="hidden" name="kind" value={meta.kind} />
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept={meta.accept}
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (form && e.currentTarget.files?.length) form.requestSubmit();
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="flex min-h-11 w-full items-center justify-center border-r border-[#d2d5d9] px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:opacity-50"
          >
            {uploadPending ? "Lädt …" : "Ändern"}
          </button>
        </form>
        <form action={clearAction} className="min-w-0 flex-1">
          <input type="hidden" name="kind" value={meta.kind} />
          <button
            type="submit"
            disabled={pending || !custom}
            className="flex min-h-11 w-full items-center justify-center px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:text-[#9ca3af] disabled:hover:bg-white"
          >
            Entfernen
          </button>
        </form>
      </div>

      <p className="text-xs text-[#6b7280]">{meta.hint}</p>
      {!custom ? <p className="text-xs text-[#9ca3af]">Aktuell: Static-Fallback</p> : null}

      {error ? (
        <p className="text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      {ok && !error ? (
        <p className="text-sm font-medium text-primary" role="status">
          Aktualisiert.
        </p>
      ) : null}
    </div>
  );
}

export function LogosSection({ settings }: { settings: ShopSettingsDTO }) {
  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-[#1f2937]">Logos</h2>
      <div className="mt-5 space-y-6">
        {LOGO_ASSETS.map((meta) => (
          <AssetBlock key={meta.kind} meta={meta} settings={settings} />
        ))}
      </div>
    </section>
  );
}

export function CoverImageSection({ settings }: { settings: ShopSettingsDTO }) {
  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm sm:p-6">
      <AssetBlock meta={COVER_ASSET} settings={settings} />
    </section>
  );
}

export function AdminLoginHeroSection({ settings }: { settings: ShopSettingsDTO }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<CmsMediaLibraryItem[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [selectOk, setSelectOk] = useState(false);
  const [loadingLibrary, startLibraryTransition] = useTransition();
  const [selectPending, startSelectTransition] = useTransition();
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadShopBrandingAssetAction,
    initial,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearShopBrandingAssetAction,
    initial,
  );

  const meta = ADMIN_LOGIN_HERO_ASSET;
  const url = resolveShopBrandingAssetUrl(settings, meta.kind);
  const custom = hasCustomUrl(settings, meta.kind);
  const pending = uploadPending || clearPending || selectPending;
  const error =
    selectError ??
    (uploadState?.kind === meta.kind ? uploadState.error : undefined) ??
    (clearState?.kind === meta.kind ? clearState.error : undefined);
  const ok =
    selectOk ||
    (uploadState?.kind === meta.kind && uploadState.ok) ||
    (clearState?.kind === meta.kind && clearState.ok);

  useEffect(() => {
    if (uploadState?.ok || clearState?.ok) router.refresh();
  }, [uploadState?.ok, clearState?.ok, router]);

  function openPicker() {
    setPickerOpen(true);
    setLibraryError(null);
    setSelectError(null);
    startLibraryTransition(async () => {
      try {
        setLibrary(await listCmsMediaLibraryAction());
      } catch {
        setLibraryError("Medienbibliothek konnte nicht geladen werden.");
      }
    });
  }

  function selectFromLibrary(selectedUrl: string) {
    setSelectError(null);
    setSelectOk(false);
    startSelectTransition(async () => {
      const result = await setShopBrandingAssetFromUrlAction({
        kind: meta.kind,
        url: selectedUrl,
      });
      if (result?.ok) {
        setSelectOk(true);
        setPickerOpen(false);
        router.refresh();
      } else {
        setSelectError(result?.error ?? "Auswahl fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-[#1f2937]">Admin-Anmeldung</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Hintergrundbild auf <code className="text-xs">/admin/login</code>. Ohne Upload wird das
        Titelbild (OG) genutzt — sonst ein neutraler Verlauf. Untertitel: Kurzbeschreibung des
        Shops.
      </p>
      <div className="mt-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1f2937]">{meta.title}</h3>
          <p className="mt-1 text-sm text-[#6b7280]">{meta.description}</p>
        </div>

        <div className={previewShellClass(meta.variant)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Branding-Vorschau inkl. Blob */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="flex overflow-hidden rounded-lg border border-[#d2d5d9] bg-white">
          <form action={uploadAction} className="min-w-0 flex-1">
            <input type="hidden" name="kind" value={meta.kind} />
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept={meta.accept}
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                const form = e.currentTarget.form;
                if (form && e.currentTarget.files?.length) form.requestSubmit();
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="flex min-h-11 w-full items-center justify-center border-r border-[#d2d5d9] px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:opacity-50"
            >
              {uploadPending ? "Lädt …" : "Hochladen"}
            </button>
          </form>
          <button
            type="button"
            disabled={pending}
            onClick={openPicker}
            className="min-w-0 flex-1 border-r border-[#d2d5d9] px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:opacity-50"
          >
            Aus Medien wählen
          </button>
          <form action={clearAction} className="min-w-0 flex-1">
            <input type="hidden" name="kind" value={meta.kind} />
            <button
              type="submit"
              disabled={pending || !custom}
              className="flex min-h-11 w-full items-center justify-center px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:text-[#9ca3af] disabled:hover:bg-white"
            >
              Entfernen
            </button>
          </form>
        </div>

        <p className="text-xs text-[#6b7280]">{meta.hint}</p>
        {!custom ? <p className="text-xs text-[#9ca3af]">Aktuell: Static-Fallback</p> : null}

        {error ? (
          <p className="text-sm text-[#b42318]" role="alert">
            {error}
          </p>
        ) : null}
        {ok && !error ? (
          <p className="text-sm font-medium text-primary" role="status">
            Aktualisiert.
          </p>
        ) : null}
      </div>

      <CmsMediaLibraryModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        library={library}
        loading={loadingLibrary}
        error={libraryError}
        onSelect={selectFromLibrary}
        title="Hintergrundbild wählen"
      />
    </section>
  );
}
