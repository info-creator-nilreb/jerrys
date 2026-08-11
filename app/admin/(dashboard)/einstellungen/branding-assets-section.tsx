"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  clearShopBrandingAssetAction,
  uploadShopBrandingAssetAction,
  type BrandingAssetFormState,
} from "@/app/admin/(dashboard)/einstellungen/actions";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import type { ShopBrandingAssetKind } from "@/lib/shop/branding-asset-kinds";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings";

const initial: BrandingAssetFormState = null;

type AssetMeta = {
  kind: ShopBrandingAssetKind;
  title: string;
  description: string;
  hint: string;
  accept: string;
  /** Große Fläche (Logo/Titelbild) vs. kompaktes Quadrat (Favicon). */
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
  }
}

function previewShellClass(variant: AssetMeta["variant"], dark?: boolean): string {
  if (variant === "cover") {
    return "flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-[#f1f2f3]";
  }
  if (variant === "square") {
    return `flex aspect-square w-full max-w-[12rem] items-center justify-center overflow-hidden rounded-lg ${dark ? "bg-[#182d4d]" : "bg-[#f1f2f3]"}`;
  }
  return `flex min-h-[9rem] w-full items-center justify-center overflow-hidden rounded-lg px-8 py-10 ${dark ? "bg-[#182d4d]" : "bg-[#f1f2f3]"}`;
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
                ? "max-h-[70%] max-w-[70%] object-contain"
                : "max-h-16 w-auto max-w-[min(100%,16rem)] object-contain"
          }
        />
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#d2d5d9] bg-white">
        <form action={uploadAction} className="contents">
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
            className="min-h-11 border-r border-[#d2d5d9] px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:opacity-50"
          >
            {uploadPending ? "Lädt …" : "Ändern"}
          </button>
        </form>
        <form action={clearAction} className="contents">
          <input type="hidden" name="kind" value={meta.kind} />
          <button
            type="submit"
            disabled={pending || !custom}
            className="min-h-11 px-3 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:text-[#9ca3af] disabled:hover:bg-white"
          >
            Entfernen
          </button>
        </form>
      </div>

      <p className="text-xs text-[#6b7280]">{meta.hint}</p>
      {!custom ? (
        <p className="text-xs text-[#9ca3af]">Aktuell: Static-Fallback</p>
      ) : null}

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
      <div className="mt-6 space-y-8">
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
