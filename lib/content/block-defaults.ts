import type { ContentBlockType } from "@/lib/content/block-types";
import {
  DEFAULT_HERO_FOCUS_X,
  DEFAULT_HERO_FOCUS_Y,
} from "@/lib/content/blocks/hero";

/** Sinnvolle Defaults beim Hinzufügen eines Blocks im Admin. */
export function defaultDataForContentBlockType(
  type: ContentBlockType,
): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        eyebrow: "",
        headline: "Neue Überschrift",
        imageUrl: "/media/hero-mood.jpg",
        imageAlt: "",
        images: [
          {
            url: "/media/hero-mood.jpg",
            alt: "",
            focusX: DEFAULT_HERO_FOCUS_X,
            focusY: DEFAULT_HERO_FOCUS_Y,
          },
        ],
        slideDurationSec: 6,
        motionEffect: "fade",
        ctaLabel: "",
        ctaHref: "",
      };
    case "richText":
      return { html: "<p>Neuer Textabschnitt.</p>" };
    case "imageText":
      return {
        title: "Bild und Text",
        body: "Beschreibung …",
        imageUrl: "/media/hero-mood.jpg",
        imageAlt: "",
        layout: "split",
        imagePosition: "left",
        ctaLabel: "",
        ctaHref: "",
      };
    case "productCategoryPick":
      return {
        title: "Produkte",
        mode: "collection",
        categorySlug: "",
        collectionSlug: "",
        productIds: [],
        limit: 12,
        showAllCta: true,
        showAllLabel: "Alle anzeigen",
        showAllHref: "",
      };
    case "curatedProductList":
      return {
        title: "Auswahl",
        source: "collection",
        productIds: [],
        collectionSlug: "",
        limit: 12,
        showAllCta: true,
        showAllLabel: "Alle anzeigen",
        showAllHref: "",
      };
    case "uspStrip":
      return {
        title: "",
        intro: "",
        items: [
          {
            icon: "design",
            title: "USP",
            body: "Kurzbeschreibung",
          },
        ],
      };
    case "faq":
      return {
        title: "Häufige Fragen",
        items: [{ question: "Frage?", answer: "Antwort." }],
      };
    case "socialReviews":
      return {
        showReviews: true,
        showSocial: true,
        titleReviews: "Stimmen",
        titleSocial: "Einblicke",
        introSocial: "",
        socialSource: "auto",
        socialLimit: 12,
      };
    case "workshopCalendar":
      return {
        title: "Kommende Termine",
        intro: "",
        showHeader: true,
        limit: 6,
        emptyMessage: "Derzeit sind keine Termine buchbar.",
        showDateRequestLink: true,
      };
    case "mapOverlay":
      return {
        query: "Stargarder Str. 16, 10437 Berlin, Deutschland",
        lat: null,
        lon: null,
        mapSpan: "neighborhood",
        grayscale: true,
        overlayPosition: "left",
        headline: "Lass dich vor Ort inspirieren",
        address: "Stargarder Str. 16, 10437 Berlin, Deutschland",
        hours: "Mi – Fr, 12 – 18 Uhr\nSa, 12 – 15 Uhr",
        ctaLabel: "Der schnellste Weg zu uns",
        ctaHref: "",
      };
  }
}
