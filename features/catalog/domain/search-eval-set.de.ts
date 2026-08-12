/**
 * Kuratierter deutscher Evaluationssatz für Storefront-Suche (Epic 14 Slice 5).
 * Synonyme, Tippfehler, Intentionen und erwartete Nulltreffer — ohne Kundendaten.
 *
 * Nutzung: manuell / CI gegen hybride und lexikalische Suche; keine Live-Telemetrie.
 */

export const SEARCH_EVAL_SET_VERSION = 1 as const;

export type SearchEvalIntent =
  | "product"
  | "synonym"
  | "typo"
  | "category"
  | "natural_language"
  | "null";

export type SearchEvalCase = {
  id: string;
  query: string;
  intent: SearchEvalIntent;
  /** Alternative Formulierungen derselben Intention (optional). */
  synonyms?: string[];
  /** Weiche Erwartung: mind. ein Treffer. */
  expectNonEmpty: boolean;
  notes?: string;
};

/**
 * Domänennähe Katzenmöbel / jerry's. Erwartungen sind bewusst weich (keine harten SKUs),
 * damit der Satz nach Katalogänderungen nutzbar bleibt.
 */
export const SEARCH_EVAL_SET_DE: readonly SearchEvalCase[] = [
  {
    id: "de-product-hoehle",
    query: "Katzenhöhle",
    intent: "product",
    synonyms: ["Höhle für Katzen", "Katzenhaus"],
    expectNonEmpty: true,
    notes: "Kernproduktbegriff",
  },
  {
    id: "de-synonym-bett",
    query: "Katzenbett",
    intent: "synonym",
    synonyms: ["Bettchen Katze", "Schlafplatz Katze"],
    expectNonEmpty: true,
    notes: "Synonym zu Höhle/Kuschelbett",
  },
  {
    id: "de-typo-hoehe",
    query: "Katzenhoele",
    intent: "typo",
    synonyms: ["Katzenhöle"],
    expectNonEmpty: true,
    notes: "Tippfehler — semantische Suche sollte robuster sein als reine Lexik",
  },
  {
    id: "de-nl-kratz",
    query: "etwas zum Kratzen für meine Katze",
    intent: "natural_language",
    synonyms: ["Kratzmöglichkeit", "Kratzbrett"],
    expectNonEmpty: true,
    notes: "Natürlichsprachliche Intention",
  },
  {
    id: "de-category-moebel",
    query: "Katzenmöbel",
    intent: "category",
    synonyms: ["Möbel für Katzen", "Katzen Einrichtung"],
    expectNonEmpty: true,
  },
  {
    id: "de-synonym-liege",
    query: "Kuschelhöhle",
    intent: "synonym",
    synonyms: ["Kuschelbett", "Plüschhöhle"],
    expectNonEmpty: true,
  },
  {
    id: "de-nl-fenster",
    query: "Platz am Fenster für die Katze",
    intent: "natural_language",
    synonyms: ["Fensterliege", "Fensterbrett Katze"],
    expectNonEmpty: true,
  },
  {
    id: "de-null-auto",
    query: "Autoreifen Winter",
    intent: "null",
    expectNonEmpty: false,
    notes: "Erwarteter Nulltreffer außerhalb des Sortiments",
  },
  {
    id: "de-null-gibberish",
    query: "xyzzyqq plonk",
    intent: "null",
    expectNonEmpty: false,
  },
  {
    id: "de-typo-kratbaum",
    query: "Kratzbaumm",
    intent: "typo",
    synonyms: ["Kratzbaum"],
    expectNonEmpty: true,
  },
] as const;
