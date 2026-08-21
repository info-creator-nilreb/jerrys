import {
  INTERNETMARKE_PORTOKASSE_URL,
  parseInternetmarkeErrorTitle,
} from "@/features/fulfillment/infrastructure/internetmarke-auth-error";

const PORTOKASSE_AUFLOADEN_HINT = `Laden Sie Ihre Portokasse unter ${INTERNETMARKE_PORTOKASSE_URL} auf und versuchen Sie es erneut.`;

function isWalletBalanceNotEnough(title: string | null, responseBody: string): boolean {
  return (
    title === "walletBalanceNotEnough" || /walletbalancenotenough/i.test(responseBody)
  );
}

export function explainInternetmarkeCheckoutFailure(status: number, responseBody: string): string {
  const title = parseInternetmarkeErrorTitle(responseBody);

  if (isWalletBalanceNotEnough(title, responseBody)) {
    return `Portokasse-Guthaben nicht ausreichend. ${PORTOKASSE_AUFLOADEN_HINT}`;
  }

  if (/shoporderid.*size must be between 1 and 18/i.test(responseBody)) {
    return "INTERNETMARKE: Bestellreferenz ungültig (interner Fehler). Bitte erneut versuchen oder Support kontaktieren.";
  }

  if (status === 401 || status === 403) {
    return `INTERNETMARKE-Zugang abgelehnt (${status}). Verbindung unter Admin → Einstellungen → Integrationen prüfen.`;
  }

  return `INTERNETMARKE Label-Kauf fehlgeschlagen (${status}). Portokasse, Produktauswahl und Verbindung prüfen.`;
}

export function explainInternetmarkeRetoureFailure(status: number, responseBody: string): string {
  const title = parseInternetmarkeErrorTitle(responseBody);

  if (isWalletBalanceNotEnough(title, responseBody)) {
    return `Portokasse-Guthaben nicht ausreichend für die Retoure. ${PORTOKASSE_AUFLOADEN_HINT}`;
  }

  return `INTERNETMARKE Retoure fehlgeschlagen (${status}). Portokasse und Verbindung prüfen.`;
}

/** Nutzerfreundliche Meldung ohne rohen Provider-JSON-Anhang. */
export function formatInternetmarkeHttpErrorMessage(error: {
  message: string;
  responseBody: string;
  status: number;
  operation: "authorize" | "checkout_pdf" | "retoure" | "health";
}): string {
  const trimmed = error.message.trim();
  if (trimmed) return trimmed;

  if (error.operation === "checkout_pdf") {
    return explainInternetmarkeCheckoutFailure(error.status, error.responseBody);
  }
  if (error.operation === "retoure") {
    return explainInternetmarkeRetoureFailure(error.status, error.responseBody);
  }
  return `INTERNETMARKE Anfrage fehlgeschlagen (${error.status}).`;
}
