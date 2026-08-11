"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  clearShopBrandingAssetAction,
  uploadShopBrandingAssetAction,
  type BrandingAssetFormState,
} from "@/app/admin/(dashboard)/einstellungen/actions";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import {
  SHOP_BRANDING_ASSET_KINDS,
  type ShopBrandingAssetKind,
} from "@/lib/shop/branding-asset-kinds";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings";

const initial: BrandingAssetFormState = null;

const LABELS: Record<ShopBrandingAssetKind, { title: string; hint: string; accept: string }> = {
  logoLight: {
    title: "Logo (heller Hintergrund)",
    hint: "PNG, JPEG, WebP oder SVG, max. 2 MB",
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
  },
  logoDark: {
    title: "Logo (dunkler Hintergrund)",
    hint: "PNG, JPEG, WebP oder SVG, max. 2 MB",
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
  },
  favicon: {
    title: "Favicon",
    hint: "PNG, ICO oder SVG, max. 512 KB, bis 512×512",
    accept: "image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml",
  },
  ogImage: {
    title: "Social-/OG-Bild",
    hint: "PNG, JPEG oder WebP, min. 200×200, max. 5 MB",
    accept: "image/png,image/jpeg,image/webp",
  },
};

const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#f7f8fa] disabled:opacity-50";

function AssetCard({
  kind,
  settings,
}: {
  kind: ShopBrandingAssetKind;
  settings: ShopSettingsDTO;
}) {
  const router = useRouter();
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadShopBrandingAssetAction,
    initial,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearShopBrandingAssetAction,
    initial,
  );

  const meta = LABELS[kind];
  const url = resolveShopBrandingAssetUrl(settings, kind);
  const hasCustom =
    kind === "logoLight"
      ? Boolean(settings.logoLightUrl)
      : kind === "logoDark"
        ? Boolean(settings.logoDarkUrl)
        : kind === "favicon"
          ? Boolean(settings.faviconUrl)
          : Boolean(settings.ogImageUrl);

  useEffect(() => {
    if (uploadState?.ok || clearState?.ok) {
      router.refresh();
    }
  }, [uploadState?.ok, clearState?.ok, router]);

  const pending = uploadPending || clearPending;
  const error =
    (uploadState?.kind === kind ? uploadState.error : undefined) ??
    (clearState?.kind === kind ? clearState.error : undefined);
  const ok =
    (uploadState?.kind === kind && uploadState.ok) ||
    (clearState?.kind === kind && clearState.ok);

  return (
    <div className="rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e8eaed] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- Favicon/SVG/Blob-Vorschau */}
          <img src={url} alt="" className="max-h-16 max-w-16 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#1f2937]">{meta.title}</h3>
          <p className="mt-1 text-xs text-[#6b7280]">{meta.hint}</p>
          <p className="mt-1 truncate text-xs text-[#9ca3af]" title={url}>
            {hasCustom ? "Eigener Upload" : "Static-Fallback"} · {url}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <form action={uploadAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="kind" value={kind} />
              <label className={`${secondaryBtn} cursor-pointer`}>
                <ImageUp className="size-4" aria-hidden />
                <span>{uploadPending ? "Lädt …" : "Datei wählen"}</span>
                <input
                  type="file"
                  name="file"
                  accept={meta.accept}
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    const form = e.currentTarget.form;
                    if (form && e.currentTarget.files?.length) {
                      form.requestSubmit();
                    }
                  }}
                />
              </label>
            </form>
            {hasCustom ? (
              <form action={clearAction}>
                <input type="hidden" name="kind" value={kind} />
                <button type="submit" disabled={pending} className={secondaryBtn} aria-label={`${meta.title} entfernen`}>
                  <Trash2 className="size-4" aria-hidden />
                  Entfernen
                </button>
              </form>
            ) : null}
          </div>

          {error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {ok && !error ? (
            <p className="mt-2 text-sm font-medium text-primary" role="status">
              Aktualisiert.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BrandingAssetsSection({ settings }: { settings: ShopSettingsDTO }) {
  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Medien</h2>
      <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
        Uploads liegen in Vercel Blob (nicht auf dem Server-Dateisystem). Fehlt ein Asset, gilt der
        Static-Fallback unter <code className="rounded bg-[#f3f4f6] px-1">/branding/</code>.
      </p>
      <div className="mt-6 space-y-4">
        {SHOP_BRANDING_ASSET_KINDS.map((kind) => (
          <AssetCard key={kind} kind={kind} settings={settings} />
        ))}
      </div>
    </section>
  );
}
