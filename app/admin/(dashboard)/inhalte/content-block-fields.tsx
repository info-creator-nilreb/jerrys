"use client";

import Link from "next/link";
import { AdminRichTextEditor } from "@/components/admin/admin-rich-text-editor";
import { CmsMediaField } from "@/components/admin/cms-media-field";
import type { ContentBlockType } from "@/lib/content/block-types";

type Props = {
  type: ContentBlockType;
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
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

export function ContentBlockFields({ type, data, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  if (type === "hero") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[#5c5f66] sm:col-span-2">
          Überschrift <span className="text-primary">*</span>
          <input
            className={fieldClass}
            value={str(data, "headline")}
            onChange={(e) => set("headline", e.target.value)}
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          Eyebrow
          <input
            className={fieldClass}
            value={str(data, "eyebrow")}
            onChange={(e) => set("eyebrow", e.target.value)}
          />
        </label>
        <CmsMediaField
          label="Hero-Bild"
          value={str(data, "imageUrl")}
          onChange={(url) => set("imageUrl", url)}
          required
          hint="Upload, Medienbibliothek oder URL"
        />
        <label className="text-sm text-[#5c5f66]">
          CTA-Label
          <input
            className={fieldClass}
            value={str(data, "ctaLabel")}
            onChange={(e) => set("ctaLabel", e.target.value)}
          />
        </label>
        <label className="text-sm text-[#5c5f66]">
          CTA-Pfad
          <input
            className={fieldClass}
            value={str(data, "ctaHref")}
            onChange={(e) => set("ctaHref", e.target.value)}
            placeholder="/produkte"
          />
        </label>
      </div>
    );
  }

  if (type === "richText") {
    return (
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
              value={str(data, "source") || "ids"}
              onChange={(e) => set("source", e.target.value)}
            >
              <option value="ids">Produkt-IDs</option>
              <option value="allActive">Alle aktiven Produkte</option>
            </select>
          </label>
        ) : null}
        {type === "productCategoryPick" ? (
          <>
            <label className="text-sm text-[#5c5f66]">
              Modus
              <select
                className={fieldClass}
                value={str(data, "mode") || "category"}
                onChange={(e) => set("mode", e.target.value)}
              >
                <option value="category">Kategorie</option>
                <option value="productIds">Produkt-IDs</option>
              </select>
            </label>
            <label className="text-sm text-[#5c5f66]">
              Kategorie-Slug
              <input
                className={fieldClass}
                value={str(data, "categorySlug")}
                onChange={(e) => set("categorySlug", e.target.value)}
              />
            </label>
          </>
        ) : null}
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
        <label className="text-sm text-[#5c5f66]">
          Limit
          <input
            type="number"
            min={1}
            max={48}
            className={fieldClass}
            value={num(data, "limit", 12)}
            onChange={(e) => set("limit", Number(e.target.value) || 12)}
          />
        </label>
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
        <label className="flex items-center gap-2 text-sm text-[#2d2e32] sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 checkbox-primary"
            checked={bool(data, "showHeader", true)}
            onChange={(e) => set("showHeader", e.target.checked)}
          />
          Listen-Header anzeigen
        </label>
        <label className="text-sm text-[#5c5f66]">
          Limit
          <input
            type="number"
            min={1}
            max={48}
            className={fieldClass}
            value={num(data, "limit", 12)}
            onChange={(e) => set("limit", Number(e.target.value) || 12)}
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
      </div>
    );
  }

  return (
    <p className="text-sm text-[#6b7280]">Keine Felder für diesen Block-Typ.</p>
  );
}
