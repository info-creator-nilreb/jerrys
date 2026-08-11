import type { ContentBlockType } from "@/lib/content/block-types";

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
        mode: "category",
        categorySlug: "",
        productIds: [],
        limit: 12,
      };
    case "curatedProductList":
      return {
        title: "Auswahl",
        source: "ids",
        productIds: [],
        limit: 12,
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
      };  }
}
