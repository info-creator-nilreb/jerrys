/** `localStorage`-Schlüssel für die Consent-JSON. */
export const CONSENT_STORAGE_KEY = "jerrys_cookie_consent";

/**
 * Bei Änderung der Kategorien oder des Speicherformats erhöhen → Nutzer sehen das Banner erneut.
 * Siehe docs/CONSENT_CONCEPT.md
 */
export const CONSENT_JSON_VERSION = 1;

/** Öffnet den Cookie-Dialog (Footer-Link). */
export const OPEN_COOKIE_SETTINGS_EVENT = "jerrys:cookie-settings";
