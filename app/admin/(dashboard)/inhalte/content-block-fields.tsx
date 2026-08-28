"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { CmsBlockAiTextAssistant } from "@/app/admin/(dashboard)/inhalte/cms-block-ai-text-assistant";
import { AdminRichTextEditor } from "@/components/admin/admin-rich-text-editor";
import { CmsMediaField } from "@/components/admin/cms-media-field";
import { HeroFocusPicker } from "@/components/admin/hero-focus-picker";
import type { ContentBlockType } from "@/lib/content/block-types";
import {
  DEFAULT_HERO_FOCUS_X,
  DEFAULT_HERO_FOCUS_Y,
  HERO_MOTION_EFFECT_LABELS,
  HERO_MOTION_EFFECTS,
  HERO_SLIDE_DURATIONS_SEC,
  readHeroSlidesFromUnknown,
  type HeroMotionEffect,
  type HeroSlide,
} from "@/lib/content/blocks/hero";
import {
  HERO_CTA_CUSTOM_VALUE,
  HERO_CTA_TARGET_PRESETS,
  resolveHeroCtaSelectValue,
} from "@/lib/content/hero-cta-targets";

export type CmsCollectionOption = {
  slug: string;
  title: string;
  productIds: string[];
};

type Props = {
  type: ContentBlockType;
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  aiReady?: boolean;
  pageTitle?: string;
  pageType?: string;
  /** Aktive Kollektionen für Produktblöcke (Slug + Produkt-IDs für Vorschau). */
  collections?: CmsCollectionOption[];
};

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function bool(data: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = data[key];
  return typeof v === "boolean" ? v : fallback;
}

function num(data: Record<string, unknown>, key: string, fallback: number): number {
  const v = data[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const fieldClass =
  "mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

export function ContentBlockFields({
  type,
  data,
  onChange,
  aiReady = false,
  pageTitle = "",
  pageType = "content",
  collections = [],
}: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  if (type === "hero") {
    const slides: HeroSlide[] = readHeroSlidesFromUnknown(data);

    const setSlides = (next: HeroSlide[]) => {
      const normalized =
        next.length > 0
          ? next
          : [
              {
                url: "/media/hero-mood.jpg",
                alt: null,
                focusX: DEFAULT_HERO_FOCUS_X,
                focusY: DEFAULT_HERO_FOCUS_Y,
              },
            ];
      onChange({
        ...data,
        images: normalized,
        imageUrl: normalized[0]!.url,
        imageAlt: normalized[0]!.alt ?? "",
      });
    };

    const motionEffect = (str(data, "motionEffect") || "fade") as HeroMotionEffect;
    const duration = num(data, "slideDurationSec", 6);

    return (
      <div className="space-y-4">
        <CmsBlockAiTextAssistant
          aiReady={aiReady}
          blockType="hero"
          pageTitle={pageTitle}
          pageType={pageType}
          existingHeadline={str(data, "headline")}
          ctaLabel={str(data, "ctaLabel")}
          onApply={(target, value) => {
            if (target === "headline") set("headline", value);
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Überschrift <span className="text-primary">*</span>
            <input
              className={fieldClass}
              value={str(data, "headline")}
              onChange={(e) => set("headline", e.target.value)}
            />
          </label>
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Eyebrow
            <input
              className={fieldClass}
              value={str(data, "eyebrow")}
              onChange={(e) => set("eyebrow", e.target.value)}
            />
          </label>

          <div className="space-y-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-[#374151]">
                Hintergrundbilder <span className="text-primary">*</span>
              </p>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Ein oder mehrere Bilder — bei mehreren als Karussell. Max. 8 Folien.
              </p>
            </div>
            <ul className="space-y-3">
              {slides.map((slide, index) => (
                <li
                  key={`hero-slide-${index}`}
                  className="rounded-lg border border-[#e8eaed] bg-[#fafafa] p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                      Bild {index + 1}
                    </p>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-[#5c5f66] hover:bg-white disabled:opacity-40"
                        aria-label="Bild nach oben"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...slides];
                          const tmp = next[index - 1]!;
                          next[index - 1] = next[index]!;
                          next[index] = tmp;
                          setSlides(next);
                        }}
                      >
                        <ChevronUp className="size-4" aria-hidden strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-[#5c5f66] hover:bg-white disabled:opacity-40"
                        aria-label="Bild nach unten"
                        disabled={index >= slides.length - 1}
                        onClick={() => {
                          const next = [...slides];
                          const tmp = next[index + 1]!;
                          next[index + 1] = next[index]!;
                          next[index] = tmp;
                          setSlides(next);
                        }}
                      >
                        <ChevronDown className="size-4" aria-hidden strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40"
                        aria-label="Bild entfernen"
                        disabled={slides.length <= 1}
                        onClick={() => setSlides(slides.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" aria-hidden strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <CmsMediaField
                    label="Bilddatei"
                    value={slide.url}
                    onChange={(url) => {
                      const next = slides.map((s, i) =>
                        i === index ? { ...s, url } : s,
                      );
                      setSlides(next);
                    }}
                    required
                    hint="Upload, Medienbibliothek oder URL"
                  />
                  {slide.url.trim() ? (
                    <HeroFocusPicker
                      key={slide.url}
                      imageUrl={slide.url}
                      focusX={slide.focusX}
                      focusY={slide.focusY}
                      onChange={(focusX, focusY) => {
                        const next = slides.map((s, i) =>
                          i === index ? { ...s, focusX, focusY } : s,
                        );
                        setSlides(next);
                      }}
                    />
                  ) : null}
                  <label className="mt-2 block text-sm text-[#5c5f66]">
                    Alt-Text (optional)
                    <input
                      className={fieldClass}
                      value={slide.alt ?? ""}
                      onChange={(e) => {
                        const next = slides.map((s, i) =>
                          i === index
                            ? { ...s, alt: e.target.value.trim() || null }
                            : s,
                        );
                        setSlides(next);
                      }}
                      maxLength={160}
                    />
                  </label>
                </li>
              ))}
            </ul>
            {slides.length < 8 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                onClick={() =>
                  setSlides([
                    ...slides,
                    {
                      url: "/media/hero-mood.jpg",
                      alt: null,
                      focusX: DEFAULT_HERO_FOCUS_X,
                      focusY: DEFAULT_HERO_FOCUS_Y,
                    },
                  ])
                }
              >
                <Plus className="size-4" aria-hidden strokeWidth={1.75} />
                Weiteres Bild hinzufügen
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <label className="text-sm text-[#5c5f66]">
              {slides.length > 1 ? "Anzeigedauer pro Bild" : "Motion-Dauer"}
              <select
                className={fieldClass}
                value={duration}
                onChange={(e) => set("slideDurationSec", Number(e.target.value))}
              >
                {HERO_SLIDE_DURATIONS_SEC.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} Sekunden
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#6b7280]">
                {slides.length > 1
                  ? "Wie lange jedes Bild sichtbar bleibt, bevor gewechselt wird."
                  : "Dauer für Zoom/Drift bei einem einzelnen Bild."}
              </span>
            </label>
            <label className="text-sm text-[#5c5f66]">
              Bild-Motion
              <select
                className={fieldClass}
                value={
                  (HERO_MOTION_EFFECTS as readonly string[]).includes(motionEffect)
                    ? motionEffect
                    : "fade"
                }
                onChange={(e) => set("motionEffect", e.target.value)}
              >
                {HERO_MOTION_EFFECTS.map((effect) => (
                  <option key={effect} value={effect}>
                    {HERO_MOTION_EFFECT_LABELS[effect].title}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[#6b7280]">
                {
                  HERO_MOTION_EFFECT_LABELS[
                    (HERO_MOTION_EFFECTS as readonly string[]).includes(motionEffect)
                      ? motionEffect
                      : "fade"
                  ].hint
                }
              </span>
            </label>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-medium text-[#374151]">Call-to-Action</p>
            <p className="text-xs text-[#6b7280]">
              Optionaler Button unter der Überschrift. Erscheint nur, wenn Label und Zielseite
              gesetzt sind.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[#5c5f66]">
                Button-Label
                <input
                  className={fieldClass}
                  value={str(data, "ctaLabel")}
                  onChange={(e) => set("ctaLabel", e.target.value)}
                  placeholder="Produkte entdecken"
                  maxLength={60}
                />
              </label>
              <label className="text-sm text-[#5c5f66]">
                Zielseite
                <select
                  className={fieldClass}
                  value={resolveHeroCtaSelectValue(str(data, "ctaHref"))}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      set("ctaHref", "");
                      return;
                    }
                    if (v === HERO_CTA_CUSTOM_VALUE) {
                      const current = str(data, "ctaHref");
                      const isPreset = HERO_CTA_TARGET_PRESETS.some((p) => p.href === current);
                      set("ctaHref", isPreset || !current ? "/" : current);
                      return;
                    }
                    set("ctaHref", v);
                  }}
                >
                  <option value="">Keine (ohne Button)</option>
                  {HERO_CTA_TARGET_PRESETS.map((p) => (
                    <option key={p.href} value={p.href}>
                      {p.label}
                    </option>
                  ))}
                  <option value={HERO_CTA_CUSTOM_VALUE}>Eigener Pfad…</option>
                </select>
              </label>
              {resolveHeroCtaSelectValue(str(data, "ctaHref")) === HERO_CTA_CUSTOM_VALUE ? (
                <label className="text-sm text-[#5c5f66] sm:col-span-2">
                  Eigener Pfad (intern, mit /)
                  <input
                    className={fieldClass}
                    value={str(data, "ctaHref")}
                    onChange={(e) => set("ctaHref", e.target.value)}
                    placeholder="/ueber-uns"
                  />
                </label>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "richText") {
    return (
      <div className="space-y-4">
        <CmsBlockAiTextAssistant
          aiReady={aiReady}
          blockType="richText"
          pageTitle={pageTitle}
          pageType={pageType}
          existingBody={str(data, "html")}
          onApply={(target, value) => {
            if (target === "html") set("html", value);
          }}
        />
        <div className="block text-sm text-[#5c5f66]">
          <span className="mb-1 block">
            Text <span className="text-primary">*</span>
          </span>
          <AdminRichTextEditor
            value={str(data, "html")}
            onChange={(html) => set("html", html)}
            placeholder="Text eingeben …"
          />
          <p className="mt-1 text-xs text-[#9ca3af]">
            Fett, Kursiv, Unterstrichen, Ausrichtung und Schriftgröße. HTML wird beim
            Speichern sanitisiert.
          </p>
        </div>
      </div>
    );
  }

  if (type === "imageText") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Titel <span className="text-primary">*</span>
          <input
            className={fieldClass}
            value={str(data, "title")}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Text <span className="text-primary">*</span>
          <textarea
            className={`${fieldClass} min-h-24`}
            value={str(data, "body")}
            onChange={(e) => set("body", e.target.value)}
          />
        </label>
        <CmsMediaField
          label="Bild"
          value={str(data, "imageUrl")}
          onChange={(url) => set("imageUrl", url)}
          hint="Upload, Medienbibliothek oder URL"
        />
        <label className="text-sm text-[#5c5f66]">
          Layout
          <select
            className={fieldClass}
            value={str(data, "layout") || "split"}
            onChange={(e) => set("layout", e.target.value)}
          >
            <option value="split">Zwei Spalten</option>
            <option value="stacked">Zentrierter Banner</option>
          </select>
        </label>
        <label className="text-sm text-[#5c5f66]">
          Bildposition (nur Spalten)
          <select
            className={fieldClass}
            value={str(data, "imagePosition") || "left"}
            onChange={(e) => set("imagePosition", e.target.value)}
          >
            <option value="left">Links</option>
            <option value="right">Rechts</option>
          </select>
        </label>
      </div>
    );
  }

  if (type === "uspStrip") {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <div className="space-y-3">
        <label className="block text-sm text-[#5c5f66]">
          Abschnitts-Titel
          <input
            className={fieldClass}
            value={str(data, "title")}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="block text-sm text-[#5c5f66]">
          Einleitung
          <textarea
            className={`${fieldClass} min-h-20`}
            value={str(data, "intro")}
            onChange={(e) => set("intro", e.target.value)}
          />
        </label>
        {items.map((raw, idx) => {
          const item =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : { icon: "design", title: "", body: "" };
          return (
            <div
              key={idx}
              className="grid gap-2 rounded-md border border-[#e8eaed] p-3 sm:grid-cols-3"
            >
              <label className="text-sm text-[#5c5f66]">
                Icon
                <select
                  className={fieldClass}
                  value={str(item, "icon") || "design"}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, icon: e.target.value };
                    set("items", next);
                  }}
                >
                  <option value="design">Design</option>
                  <option value="germany">Germany</option>
                  <option value="heart">Heart</option>
                </select>
              </label>
              <label className="text-sm text-[#5c5f66]">
                Titel
                <input
                  className={fieldClass}
                  value={str(item, "title")}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, title: e.target.value };
                    set("items", next);
                  }}
                />
              </label>
              <label className="text-sm text-[#5c5f66]">
                Text
                <input
                  className={fieldClass}
                  value={str(item, "body")}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, body: e.target.value };
                    set("items", next);
                  }}
                />
              </label>
            </div>
          );
        })}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            set("items", [
              ...items,
              { icon: "design", title: "USP", body: "Beschreibung" },
            ])
          }
        >
          + USP hinzufügen
        </button>
      </div>
    );
  }

  if (type === "faq") {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <div className="space-y-3">
        <label className="block text-sm text-[#5c5f66]">
          Abschnittstitel
          <input
            className={fieldClass}
            value={str(data, "title")}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        {items.map((raw, idx) => {
          const item =
            raw && typeof raw === "object"
              ? (raw as Record<string, unknown>)
              : { question: "", answer: "" };
          return (
            <div key={idx} className="space-y-2 rounded-md border border-[#e8eaed] p-3">
              <label className="block text-sm text-[#5c5f66]">
                Frage
                <input
                  className={fieldClass}
                  value={str(item, "question")}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, question: e.target.value };
                    set("items", next);
                  }}
                />
              </label>
              <label className="block text-sm text-[#5c5f66]">
                Antwort
                <textarea
                  className={`${fieldClass} min-h-20`}
                  value={str(item, "answer")}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, answer: e.target.value };
                    set("items", next);
                  }}
                />
              </label>
            </div>
          );
        })}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() =>
            set("items", [...items, { question: "Frage?", answer: "Antwort." }])
          }
        >
          + Frage hinzufügen
        </button>
      </div>
    );
  }

  if (type === "curatedProductList" || type === "productCategoryPick") {
    const ids = Array.isArray(data.productIds)
      ? data.productIds.filter((x): x is string => typeof x === "string").join(", ")
      : "";
    const curatedSource = str(data, "source") || "ids";
    const pickMode = str(data, "mode") || "collection";
    const usesCollection =
      (type === "curatedProductList" && curatedSource === "collection") ||
      (type === "productCategoryPick" && pickMode === "collection");
    const usesCategory =
      type === "productCategoryPick" && pickMode === "category";
    const usesProductIds =
      (type === "curatedProductList" && curatedSource === "ids") ||
      (type === "productCategoryPick" && pickMode === "productIds");
    const showAllCta = bool(data, "showAllCta", false);

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Titel
          <input
            className={fieldClass}
            value={str(data, "title")}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        {type === "curatedProductList" ? (
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Quelle
            <select
              className={fieldClass}
              value={curatedSource}
              onChange={(e) => set("source", e.target.value)}
            >
              <option value="collection">Kollektion</option>
              <option value="ids">Produkt-IDs</option>
              <option value="allActive">Alle aktiven Produkte</option>
            </select>
          </label>
        ) : null}
        {type === "productCategoryPick" ? (
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Quelle
            <select
              className={fieldClass}
              value={pickMode}
              onChange={(e) => set("mode", e.target.value)}
            >
              <option value="collection">Kollektion</option>
              <option value="category">Kategorie</option>
              <option value="productIds">Produkt-IDs</option>
            </select>
          </label>
        ) : null}
        {usesCollection ? (
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Kollektion
            <select
              className={fieldClass}
              value={str(data, "collectionSlug")}
              onChange={(e) => set("collectionSlug", e.target.value)}
            >
              <option value="">Kollektion wählen …</option>
              {collections.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
            {collections.length === 0 ? (
              <span className="mt-1 block text-xs text-[#6b7280]">
                Keine aktiven Kollektionen — bitte unter Katalog → Kollektionen anlegen.
              </span>
            ) : null}
          </label>
        ) : null}
        {usesCategory ? (
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Kategorie-Slug
            <input
              className={fieldClass}
              value={str(data, "categorySlug")}
              onChange={(e) => set("categorySlug", e.target.value)}
              placeholder="z. B. katzenmoebel"
            />
          </label>
        ) : null}
        {usesProductIds ? (
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Produkt-IDs (kommagetrennt)
            <input
              className={fieldClass}
              value={ids}
              onChange={(e) =>
                set(
                  "productIds",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
        ) : null}
        <label className="text-sm text-[#5c5f66]">
          Anzahl anzeigen
          <input
            type="number"
            min={1}
            max={48}
            className={fieldClass}
            value={num(data, "limit", 12)}
            onChange={(e) => set("limit", Number(e.target.value) || 12)}
          />
        </label>
        <div className="sm:col-span-2 space-y-3 rounded-lg border border-[#e8eaed] bg-[#fafafa] p-3">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#374151]">
            <input
              type="checkbox"
              className="checkbox-primary mt-0.5 size-4"
              checked={showAllCta}
              onChange={(e) => set("showAllCta", e.target.checked)}
            />
            <span>
              <span className="font-medium">Button „Alle anzeigen“</span>
              <span className="mt-0.5 block text-xs text-[#6b7280]">
                Unter der Produktliste. Ziel automatisch aus Kollektion/Kategorie/Katalog,
                sofern kein eigener Pfad gesetzt ist.
              </span>
            </span>
          </label>
          {showAllCta ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[#5c5f66]">
                Button-Text
                <input
                  className={fieldClass}
                  value={str(data, "showAllLabel")}
                  placeholder="Alle anzeigen"
                  onChange={(e) => set("showAllLabel", e.target.value)}
                />
              </label>
              <label className="text-sm text-[#5c5f66]">
                Ziel-Pfad (optional)
                <input
                  className={fieldClass}
                  value={str(data, "showAllHref")}
                  placeholder={
                    usesCollection
                      ? "/kollektionen/…"
                      : usesCategory
                        ? "/kategorien/…"
                        : "/produkte"
                  }
                  onChange={(e) => set("showAllHref", e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (type === "socialReviews") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-[#2d2e32]">
          <input
            type="checkbox"
            className="size-4 checkbox-primary"
            checked={bool(data, "showReviews", true)}
            onChange={(e) => set("showReviews", e.target.checked)}
          />
          Amazon-Reviews anzeigen
        </label>
        <label className="flex items-center gap-2 text-sm text-[#2d2e32]">
          <input
            type="checkbox"
            className="size-4 checkbox-primary"
            checked={bool(data, "showSocial", true)}
            onChange={(e) => set("showSocial", e.target.checked)}
          />
          Social-Bilder anzeigen
        </label>
        <label className="text-sm text-[#5c5f66]">
          Titel Reviews
          <input
            className={fieldClass}
            value={str(data, "titleReviews")}
            onChange={(e) => set("titleReviews", e.target.value)}
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Titel Social
          <input
            className={fieldClass}
            value={str(data, "titleSocial")}
            onChange={(e) => set("titleSocial", e.target.value)}
          />
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Einleitung Social
          <textarea
            className={`${fieldClass} min-h-16`}
            value={str(data, "introSocial")}
            onChange={(e) => set("introSocial", e.target.value)}
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Bildquelle
          <select
            className={fieldClass}
            value={str(data, "socialSource") || "auto"}
            onChange={(e) => set("socialSource", e.target.value)}
          >
            <option value="auto">Auto (Instagram-Feed, sonst kuratiert)</option>
            <option value="instagram">Nur Instagram-Feed</option>
            <option value="curated">Nur kuratierte Marketing-Bilder</option>
          </select>
        </label>
        <label className="text-sm text-[#5c5f66]">
          Anzahl Bilder
          <input
            type="number"
            min={1}
            max={24}
            className={fieldClass}
            value={num(data, "socialLimit", 12)}
            onChange={(e) => set("socialLimit", Number(e.target.value) || 12)}
          />
        </label>
        <div className="rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280] sm:col-span-2">
          <p className="font-medium text-[#374151]">Instagram-Feed</p>
          <p className="mt-1">
            OAuth-Verbindung und Sync unter{" "}
            <Link
              href="/admin/inhalte/marketing"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Inhalte → Marketing
            </Link>
            . Darstellung wie bisheriges Social-Carousel (Desktop/Mobile). Zunächst nur Bilder.
          </p>
        </div>
      </div>
    );
  }

  if (type === "workshopCalendar") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280] sm:col-span-2">
          <span className="font-medium text-[#374151]">Kompakte Einbettung:</span> Datum,
          Uhrzeit und freie Plätze. Liegen Termine in mehreren Monaten, erscheinen Monats-Chips.
          Ort, Preis und Buchung erst auf der Termindetailseite.
        </p>
        <label className="flex items-center gap-2 text-sm text-[#2d2e32] sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 checkbox-primary"
            checked={bool(data, "showHeader", true)}
            onChange={(e) => set("showHeader", e.target.checked)}
          />
          Listen-Header anzeigen
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Titel (optional)
          <input
            className={fieldClass}
            value={str(data, "title")}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Kommende Termine"
          />
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Einleitung (optional, kurz halten)
          <textarea
            className={`${fieldClass} min-h-16`}
            value={str(data, "intro")}
            onChange={(e) => set("intro", e.target.value)}
            placeholder="Leer lassen für maximale Schlichtheit"
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Max. Termine
          <input
            type="number"
            min={1}
            max={24}
            className={fieldClass}
            value={num(data, "limit", 6)}
            onChange={(e) => set("limit", Number(e.target.value) || 6)}
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Leerer Zustand
          <input
            className={fieldClass}
            value={str(data, "emptyMessage")}
            onChange={(e) => set("emptyMessage", e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[#2d2e32] sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 checkbox-primary"
            checked={bool(data, "showDateRequestLink", true)}
            onChange={(e) => set("showDateRequestLink", e.target.checked)}
          />
          Link „Wunschtermin anfragen“ bei leerer Liste
        </label>
        <p className="text-xs text-[#9ca3af] sm:col-span-2">
          Ausgebuchte Termine werden ausgeblendet. Vollständige Karten nur unter{" "}
          <Link href="/termine" className="font-medium text-primary hover:underline">
            /termine
          </Link>
          . Pflege unter Admin → Termine.
        </p>
      </div>
    );
  }

  if (type === "mapOverlay") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="rounded-md border border-[#e8eaed] bg-[#f7f8fa] px-3 py-2 text-xs text-[#6b7280] sm:col-span-2">
          <span className="font-medium text-[#374151]">Kartenhintergrund:</span>{" "}
          OpenStreetMap (Graustufen), analog zur Standort-Sektion auf edelweissdesigns.de.
          Overlay-Text ist optional — ohne Text bleibt nur die Karte.
        </p>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Adresse für die Karte <span className="text-primary">*</span>
          <input
            className={fieldClass}
            value={str(data, "query")}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Stargarder Str. 16, 10437 Berlin"
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Breite (optional)
          <input
            className={fieldClass}
            inputMode="decimal"
            value={data.lat == null || data.lat === "" ? "" : String(data.lat)}
            onChange={(e) => {
              const v = e.target.value.trim();
              set("lat", v === "" ? null : Number(v));
            }}
            placeholder="52.54…"
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Länge (optional)
          <input
            className={fieldClass}
            inputMode="decimal"
            value={data.lon == null || data.lon === "" ? "" : String(data.lon)}
            onChange={(e) => {
              const v = e.target.value.trim();
              set("lon", v === "" ? null : Number(v));
            }}
            placeholder="13.42…"
          />
        </label>
        <p className="text-xs text-[#9ca3af] sm:col-span-2">
          Koordinaten überschreiben die Geocoding-Suche, falls beide gesetzt sind.
        </p>
        <label className="text-sm text-[#5c5f66]">
          Ausschnitt
          <select
            className={fieldClass}
            value={str(data, "mapSpan") || "neighborhood"}
            onChange={(e) => set("mapSpan", e.target.value)}
          >
            <option value="near">Nah (Straße)</option>
            <option value="neighborhood">Viertel</option>
            <option value="city">Stadt</option>
          </select>
        </label>
        <label className="text-sm text-[#5c5f66]">
          Overlay-Position
          <select
            className={fieldClass}
            value={str(data, "overlayPosition") || "left"}
            onChange={(e) => set("overlayPosition", e.target.value)}
          >
            <option value="left">Links</option>
            <option value="right">Rechts</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#2d2e32] sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 checkbox-primary"
            checked={bool(data, "grayscale", true)}
            onChange={(e) => set("grayscale", e.target.checked)}
          />
          Karte in Graustufen
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Overlay-Überschrift
          <input
            className={fieldClass}
            value={str(data, "headline")}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Lass dich vor Ort inspirieren"
          />
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Adresse im Overlay
          <textarea
            className={`${fieldClass} min-h-16`}
            value={str(data, "address")}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Stargarder Str. 16&#10;10437 Berlin, Deutschland"
          />
        </label>
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Öffnungszeiten
          <textarea
            className={`${fieldClass} min-h-16`}
            value={str(data, "hours")}
            onChange={(e) => set("hours", e.target.value)}
            placeholder="Mi – Fr, 12 – 18 Uhr"
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Link-Text
          <input
            className={fieldClass}
            value={str(data, "ctaLabel")}
            onChange={(e) => set("ctaLabel", e.target.value)}
            placeholder="Der schnellste Weg zu uns"
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Link-Ziel (optional)
          <input
            className={fieldClass}
            value={str(data, "ctaHref")}
            onChange={(e) => set("ctaHref", e.target.value)}
            placeholder="https://… oder /kontakt"
          />
        </label>
        <p className="text-xs text-[#9ca3af] sm:col-span-2">
          Leer lassen beim Ziel: der Link öffnet OpenStreetMap zur Adresse. HTTPS oder interner
          Pfad ab /.
        </p>
      </div>
    );
  }
  return (
    <p className="text-sm text-[#6b7280]">Keine Felder für diesen Block-Typ.</p>
  );
}
