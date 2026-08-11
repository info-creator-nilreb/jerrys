"use client";

import Image from "next/image";
import { useDeferredValue, useMemo } from "react";
import { UspIcon } from "@/components/storefront/usp-icons";
import { isContentBlockType, type ContentBlockType } from "@/lib/content/block-types";
import { sanitizeContentRichTextHtml } from "@/lib/content/sanitize-content-html";

export type LivePreviewProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
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
}: {
  block: LivePreviewBlock;
  products: LivePreviewProduct[];
}) {
  const type = block.type;
  const data = block.data;

  if (!isContentBlockType(type)) {
    return (
      <p className="px-4 py-3 text-xs text-[#9ca3af]">Unbekannter Block: {String(type)}</p>
    );
  }

  if (type === "hero") {
    const imageUrl = str(data, "imageUrl") || "/media/hero-mood.jpg";
    return (
      <section className="relative h-56 overflow-hidden bg-[#111]">
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover opacity-90"
          sizes="400px"
          unoptimized={imageUrl.startsWith("https://")}
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/60 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-center px-4">
          {str(data, "eyebrow") ? (
            <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
              {str(data, "eyebrow")}
            </p>
          ) : null}
          <p className="mt-1 text-lg font-semibold text-white">
            {str(data, "headline") || "Überschrift"}
          </p>
          {str(data, "ctaLabel") ? (
            <span className="mt-3 inline-flex w-fit rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">
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
    const ids = Array.isArray(data.productIds)
      ? data.productIds.filter((x): x is string => typeof x === "string")
      : [];
    const limit =
      typeof data.limit === "number" && Number.isFinite(data.limit) ? data.limit : 12;
    const list =
      type === "curatedProductList" && source === "allActive"
        ? products.slice(0, limit)
        : ids
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is LivePreviewProduct => Boolean(p))
            .slice(0, limit);

    return (
      <section className="bg-[#f8faf8] px-4 py-8">
        {str(data, "title") ? (
          <h3 className="text-center text-base font-semibold">{str(data, "title")}</h3>
        ) : null}
        {list.length === 0 ? (
          <p className="mt-4 text-center text-xs text-[#9ca3af]">
            {source === "allActive"
              ? "Alle aktiven Produkte (Vorschau: Katalog-Snapshot)."
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
    const limit = num(data, "limit", 12);
    return (
      <section className="px-4 py-8">
        <div className="rounded-md border border-dashed border-[#d1d5db] bg-[#fafafa] p-4 text-sm text-[#374151]">
          <p className="font-medium text-[#1f2937]">Termin-Kalender</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Live-Daten aus veröffentlichten Workshops (max. {limit}). Buchung über denselben
            Pfad wie /termine — hier nur Vorschau der Einstellungen.
          </p>
          {bool(data, "showHeader", true) ? (
            <p className="mt-3 font-semibold text-(--foreground-heading)">{title}</p>
          ) : (
            <p className="mt-3 text-xs text-[#9ca3af]">Header ausgeblendet</p>
          )}
          {str(data, "intro") ? (
            <p className="mt-1 text-xs text-[#6b7280]">{str(data, "intro")}</p>
          ) : null}
          {str(data, "emptyMessage") ? (
            <p className="mt-2 text-xs text-[#9ca3af]">Leer: {str(data, "emptyMessage")}</p>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}

/**
 * Live-Vorschau ungespeicherter CMS-Blöcke (Admin).
 * Produktkarten nutzen den übergebenen Katalog-Snapshot.
 */
export function ContentLivePreview({
  title,
  pageType,
  blocks,
  products,
}: {
  title: string;
  pageType: "homepage" | "content" | "legal";
  blocks: LivePreviewBlock[];
  products: LivePreviewProduct[];
}) {
  const deferredBlocks = useDeferredValue(blocks);
  const deferredTitle = useDeferredValue(title);

  const body = useMemo(
    () =>
      deferredBlocks.map((block) => (
        <PreviewBlock key={block.clientId} block={block} products={products} />
      )),
    [deferredBlocks, products],
  );

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border border-[#e8eaed] bg-[#f3f4f6] shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e8eaed] bg-white px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Live-Vorschau
          </p>
          <p className="text-sm font-medium text-[#1f2937]">
            {deferredTitle.trim() || "Ohne Titel"}
            <span className="ml-2 text-xs font-normal text-[#9ca3af]">({pageType})</span>
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
          ungespeichert
        </span>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
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
