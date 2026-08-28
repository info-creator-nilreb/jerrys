"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { useDeferredValue, useMemo } from "react";
import { HeroBackgroundCarousel } from "@/components/content/blocks/hero-background-carousel";
import { MapOverlayCard } from "@/components/content/blocks/map-overlay-card";
import { UspIcon } from "@/components/storefront/usp-icons";
import {
  HERO_MOTION_EFFECTS,
  HERO_SLIDE_DURATIONS_SEC,
  readHeroSlidesFromUnknown,
  type HeroMotionEffect,
  type HeroSlideDurationSec,
} from "@/lib/content/blocks/hero";
import {
  mapOverlayHasCard,
  resolveMapOverlayCtaHref,
} from "@/lib/content/blocks/map-overlay";
import { isContentBlockType, type ContentBlockType } from "@/lib/content/block-types";
import { sanitizeContentRichTextHtml } from "@/lib/content/sanitize-content-html";

export type LivePreviewProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
};

export type LivePreviewCollection = {
  slug: string;
  title: string;
  productIds: string[];
};

export type LivePreviewBlock = {
  clientId: string;
  type: ContentBlockType | string;
  data: Record<string, unknown>;
};

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === "string" ? v : "";
}

function bool(data: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = data[key];
  return typeof v === "boolean" ? v : fallback;
}

function num(data: Record<string, unknown>, key: string, fallback: number): number {
  const v = data[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function PreviewBlock({
  block,
  products,
  collections,
}: {
  block: LivePreviewBlock;
  products: LivePreviewProduct[];
  collections: LivePreviewCollection[];
}) {
  const type = block.type;
  const data = block.data;

  if (!isContentBlockType(type)) {
    return (
      <p className="px-4 py-3 text-xs text-[#9ca3af]">Unbekannter Block: {String(type)}</p>
    );
  }

  if (type === "hero") {
    const slides = readHeroSlidesFromUnknown(data);
    const durationRaw = num(data, "slideDurationSec", 6);
    const slideDurationSec = (
      (HERO_SLIDE_DURATIONS_SEC as readonly number[]).includes(durationRaw)
        ? durationRaw
        : 6
    ) as HeroSlideDurationSec;
    const motionRaw = str(data, "motionEffect") || "fade";
    const motionEffect = (
      (HERO_MOTION_EFFECTS as readonly string[]).includes(motionRaw)
        ? motionRaw
        : "fade"
    ) as HeroMotionEffect;

    return (
      <section className="relative aspect-[4/5] min-h-72 overflow-hidden bg-[#111] sm:aspect-[16/10] sm:min-h-80">
        <HeroBackgroundCarousel
          slides={slides}
          slideDurationSec={slideDurationSec}
          motionEffect={motionEffect}
          compact
        />
        <div className="absolute inset-0 z-[2] bg-linear-to-r from-black/60 via-black/20 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-center px-4 py-8">
          {str(data, "eyebrow") ? (
            <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
              {str(data, "eyebrow")}
            </p>
          ) : null}
          <p className="mt-1 text-lg font-semibold text-white">
            {str(data, "headline") || "Überschrift"}
          </p>
          {str(data, "ctaLabel") ? (
            <span className="mt-3 inline-flex w-fit rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white">
              {str(data, "ctaLabel")}
            </span>
          ) : null}
        </div>
      </section>
    );
  }

  if (type === "richText") {
    const html = sanitizeContentRichTextHtml(str(data, "html")) ?? "";
    return (
      <div
        className="prose prose-sm max-w-none px-4 py-6 prose-headings:text-[#1f2937] prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (type === "uspStrip") {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <section className="px-4 py-8">
        {str(data, "title") ? (
          <h3 className="text-center text-base font-semibold text-[#1f2937]">
            {str(data, "title")}
          </h3>
        ) : null}
        {str(data, "intro") ? (
          <p className="mx-auto mt-2 max-w-md text-center text-xs text-[#6b7280]">
            {str(data, "intro")}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {items.map((raw, i) => {
            const item =
              raw && typeof raw === "object"
                ? (raw as Record<string, unknown>)
                : { icon: "design", title: "", body: "" };
            const icon = str(item, "icon") as "design" | "germany" | "heart";
            return (
              <article
                key={i}
                className="rounded-md border border-[#e8eaed] bg-white p-3 text-center"
              >
                <div className="flex justify-center">
                  <UspIcon
                    variant={
                      icon === "germany" || icon === "heart" || icon === "design"
                        ? icon
                        : "design"
                    }
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-[#1f2937]">
                  {str(item, "title") || "USP"}
                </p>
                <p className="mt-1 text-[11px] text-[#6b7280]">{str(item, "body")}</p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (type === "imageText") {
    const imageUrl = str(data, "imageUrl") || "/media/hero-mood.jpg";
    const stacked = str(data, "layout") === "stacked";
    if (stacked) {
      return (
        <section className="border-y border-[#e8eaed] bg-white px-4 py-8">
          <h3 className="text-center text-base font-semibold">{str(data, "title")}</h3>
          <p className="mx-auto mt-2 max-w-md text-center text-xs text-[#6b7280]">
            {str(data, "body")}
          </p>
          <div className="relative mx-auto mt-4 aspect-[2/1] max-w-lg overflow-hidden rounded-lg bg-[#f3f4f6]">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="400px"
              unoptimized
            />
          </div>
        </section>
      );
    }
    return (
      <section className="grid gap-4 px-4 py-8 sm:grid-cols-2 sm:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#f3f4f6]">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="200px"
            unoptimized
          />
        </div>
        <div>
          <h3 className="text-base font-semibold">{str(data, "title")}</h3>
          <p className="mt-2 text-xs text-[#6b7280]">{str(data, "body")}</p>
        </div>
      </section>
    );
  }

  if (type === "curatedProductList" || type === "productCategoryPick") {
    const source = str(data, "source") || "ids";
    const mode = str(data, "mode") || "collection";
    const collectionSlug = str(data, "collectionSlug");
    const ids = Array.isArray(data.productIds)
      ? data.productIds.filter((x): x is string => typeof x === "string")
      : [];
    const limit =
      typeof data.limit === "number" && Number.isFinite(data.limit) ? data.limit : 12;
    const usesCollection =
      (type === "curatedProductList" && source === "collection") ||
      (type === "productCategoryPick" && mode === "collection");
    const collection = usesCollection
      ? collections.find((c) => c.slug === collectionSlug)
      : undefined;
    const list = (() => {
      if (type === "curatedProductList" && source === "allActive") {
        return products.slice(0, limit);
      }
      if (usesCollection) {
        const collectionIds = collection?.productIds ?? [];
        return collectionIds
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is LivePreviewProduct => Boolean(p))
          .slice(0, limit);
      }
      return ids
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is LivePreviewProduct => Boolean(p))
        .slice(0, limit);
    })();
    const showAllCta = bool(data, "showAllCta", false);
    const showAllLabel = str(data, "showAllLabel").trim() || "Alle anzeigen";

    return (
      <section className="bg-[#f8faf8] px-4 py-8">
        {str(data, "title") ? (
          <h3 className="text-center text-base font-semibold">{str(data, "title")}</h3>
        ) : null}
        {list.length === 0 ? (
          <p className="mt-4 text-center text-xs text-[#9ca3af]">
            {type === "curatedProductList" && source === "allActive"
              ? "Alle aktiven Produkte (Vorschau: Katalog-Snapshot)."
              : usesCollection
                ? collectionSlug
                  ? "Keine Produkte in dieser Kollektion (Vorschau)."
                  : "Bitte Kollektion wählen."
                : "Keine Produkt-IDs / keine Treffer."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-[#e8eaed] bg-white p-2"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded bg-[#f3f4f6]">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  ) : null}
                </div>
                <span className="text-xs font-medium text-[#1f2937]">{p.title}</span>
              </li>
            ))}
          </ul>
        )}
        {showAllCta ? (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white">
              {showAllLabel}
            </span>
          </div>
        ) : null}
      </section>
    );
  }

  if (type === "socialReviews") {
    return (
      <section className="space-y-6 px-4 py-8">
        {bool(data, "showReviews", true) ? (
          <div className="rounded-md border border-dashed border-[#d1d5db] bg-[#f9fafb] p-4 text-center">
            <p className="text-sm font-semibold text-[#1f2937]">
              {str(data, "titleReviews") || "Kundenstimmen"}
            </p>
            <p className="mt-1 text-[11px] text-[#6b7280]">
              Live-Daten aus Kundenstimmen (Shop-Datenbank).
            </p>
          </div>
        ) : null}
        {bool(data, "showSocial", true) ? (
          <div className="rounded-md border border-dashed border-[#d1d5db] bg-white p-4 text-center">
            <p className="text-sm font-semibold text-[#1f2937]">
              {str(data, "titleSocial") || "Social"}
            </p>
            {str(data, "introSocial") ? (
              <p className="mt-1 text-[11px] text-[#6b7280]">{str(data, "introSocial")}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-[#9ca3af]">
              Live-Bilder aus Social-Medien-Pflege.
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  if (type === "faq") {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <section className="px-4 py-8">
        {str(data, "title") ? (
          <h3 className="mb-3 text-base font-semibold">{str(data, "title")}</h3>
        ) : null}
        <ul className="space-y-2">
          {items.map((raw, i) => {
            const item =
              raw && typeof raw === "object"
                ? (raw as Record<string, unknown>)
                : { question: "", answer: "" };
            return (
              <li key={i} className="rounded-md border border-[#e8eaed] bg-white p-3">
                <p className="text-sm font-medium">{str(item, "question")}</p>
                <p className="mt-1 text-xs text-[#6b7280]">{str(item, "answer")}</p>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (type === "workshopCalendar") {
    const title = str(data, "title") || "Kommende Termine";
    const limit = num(data, "limit", 6);
    return (
      <section className="px-4 py-6">
        <div className="mx-auto max-w-md">
          {bool(data, "showHeader", true) ? (
            <p className="mb-2 text-sm font-semibold text-[#1f2937]">{title}</p>
          ) : null}
          {str(data, "intro") ? (
            <p className="mb-2 text-xs text-[#6b7280]">{str(data, "intro")}</p>
          ) : null}
          <ul className="divide-y divide-[#e5e7eb] overflow-hidden rounded-md border border-[#e5e7eb] bg-white text-sm">
            {Array.from({ length: Math.min(limit, 3) }, (_, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-[#374151]"
              >
                <span className="font-medium">Sa. 0{i + 1}.09. · 14:00</span>
                <span className="tabular-nums text-[#1f2937]">{4 - i} Plätze frei</span>
                <span className="text-primary">Details</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-[#9ca3af]">
            Vorschau — Live-Termine ohne Ort/Preis; Details auf Terminseite.
          </p>
        </div>
      </section>
    );
  }

  if (type === "mapOverlay") {
    const overlay = {
      headline: str(data, "headline") || null,
      address: str(data, "address") || null,
      hours: str(data, "hours") || null,
      ctaLabel: str(data, "ctaLabel") || null,
    };
    const ctaHref = resolveMapOverlayCtaHref(
      {
        ctaLabel: overlay.ctaLabel,
        ctaHref: str(data, "ctaHref") || null,
        query: str(data, "query") || null,
      },
      null,
    );
    const right = str(data, "overlayPosition") === "right";
    const grayscale = bool(data, "grayscale", true);

    return (
      <section className="relative min-h-56 overflow-hidden bg-neutral-200">
        <div
          className={`absolute inset-0 ${grayscale ? "grayscale" : ""}`}
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(#d4d4d4 1px, transparent 1px), linear-gradient(90deg, #d4d4d4 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            backgroundColor: "#e5e5e5",
          }}
        />
        <MapPin
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-10 -translate-x-1/2 -translate-y-full text-primary drop-shadow-md"
          fill="currentColor"
          stroke="white"
          strokeWidth={1.5}
        />
        {mapOverlayHasCard(overlay) ? (
          <div
            className={`relative z-10 flex min-h-56 items-center px-4 py-6 ${
              right ? "justify-end" : "justify-start"
            }`}
          >
            <MapOverlayCard data={overlay} ctaHref={ctaHref} compact />
          </div>
        ) : (
          <p className="relative z-10 px-4 py-16 text-center text-[11px] text-[#6b7280]">
            {str(data, "query") || "Standortkarte"}
          </p>
        )}
      </section>
    );
  }

  return null;
}

/**
 * Live-Vorschau der CMS-Blöcke (Admin).
 * Viewport-hohe, scrollbare Karte — damit lange Startseiten nicht abgeschnitten werden.
 * Produktkarten nutzen den übergebenen Katalog-Snapshot.
 */
export function ContentLivePreview({
  title,
  pageType,
  blocks,
  products,
  collections = [],
  hasUnsavedChanges = false,
}: {
  title: string;
  pageType: "homepage" | "content" | "legal";
  blocks: LivePreviewBlock[];
  products: LivePreviewProduct[];
  collections?: LivePreviewCollection[];
  /** true = Editor weicht vom letzten gespeicherten Stand ab */
  hasUnsavedChanges?: boolean;
}) {
  const deferredBlocks = useDeferredValue(blocks);
  const deferredTitle = useDeferredValue(title);

  const body = useMemo(
    () =>
      deferredBlocks.map((block) => (
        <PreviewBlock
          key={block.clientId}
          block={block}
          products={products}
          collections={collections}
        />
      )),
    [deferredBlocks, products, collections],
  );

  return (
    <div className="flex h-[min(100%,calc(100dvh-6.5rem))] max-h-[calc(100dvh-6.5rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl border border-[#e8eaed] bg-[#f3f4f6] shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e8eaed] bg-white px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Live-Vorschau
          </p>
          <p className="truncate text-sm font-medium text-[#1f2937]">
            {deferredTitle.trim() || "Ohne Titel"}
            <span className="ml-2 text-xs font-normal text-[#9ca3af]">({pageType})</span>
          </p>
        </div>
        {hasUnsavedChanges ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            ungespeichert
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            gespeichert
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
        {pageType !== "homepage" ? (
          <div className="border-b border-[#f3f4f6] px-4 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-[#1f2937]">
              {deferredTitle.trim() || "Seitentitel"}
            </h2>
          </div>
        ) : null}
        {deferredBlocks.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-[#9ca3af]">
            Noch keine Blöcke — Vorschau erscheint beim Bearbeiten.
          </p>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
