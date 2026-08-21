/**
 * Klassifiziert INTERNETMARKE POST /user Fehler.
 * Developer-Portal „Approved“ ≠ Portokasse-Freigabe unter Geschäftsanwendungen.
 */

export const INTERNETMARKE_PORTOKASSE_URL = "https://portokasse.deutschepost.de";

const PORTOKASSE_FREIGABE_HINT =
  "Developer-Portal „Approved“ reicht nicht. Nach dem ersten Token-Versuch E-Mail an die Portokasse-Adresse prüfen, dann unter Meine Daten → Geschäftsanwendungen die App dauerhaft freigeben und erneut verbinden. Login ist die Portokasse (portokasse.deutschepost.de), nicht das Developer-Portal. Entwickler-Portokasse ggf. bei it-csp@deutschepost.de beantragen.";

export function parseInternetmarkeErrorTitle(responseBody: string): string | null {
  const text = responseBody.trim();
  if (!text) return null;
  try {
    const data = JSON.parse(text) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim() ? data.title.trim() : null;
  } catch {
    return null;
  }
}

export function explainInternetmarkeAuthFailure(status: number, responseBody: string): string {
  const title = parseInternetmarkeErrorTitle(responseBody);
  const body = responseBody.toLowerCase();

  if (/invalid client identifier/i.test(responseBody)) {
    return "API-Gateway: ungültiger API Key (client_id). Im Developer Portal den API Key (nicht App-Name oder App-ID) als INTERNETMARKE_CLIENT_ID setzen.";
  }

  if (
    status === 401 ||
    title === "genericUserAuthenticationError" ||
    /genericuserauthenticationerror/i.test(responseBody)
  ) {
    if (/locked/i.test(body)) {
      return `Portokasse-Konto ungültig oder gesperrt (401). ${PORTOKASSE_FREIGABE_HINT}`;
    }
    return `Token abgelehnt (401). ${PORTOKASSE_FREIGABE_HINT}`;
  }

  if (status === 500) {
    return "DHL meldet 500 beim Token. Häufig: App im Developer Portal noch „in progress/pending“ (warten bis Approved), falsches Secret, oder Portokasse noch nicht freigegeben. API-Status und Portokasse-Freigabe prüfen, dann erneut verbinden.";
  }

  return `INTERNETMARKE Auth fehlgeschlagen (${status}).`;
}

export function appendApiKeyDiagnostic(
  message: string,
  catalog:
    | { ok: true }
    | { ok: false; status?: number },
): string {
  if (catalog.ok) {
    return `${message} Der API Key ist gültig (Products API OK) — der 401 kommt von der Portokasse-Freigabe oder dem Portokasse-Passwort.`;
  }
  if (catalog.status === 401 || catalog.status === 403) {
    return `${message} Auch die Products API lehnt den API Key ab — INTERNETMARKE_CLIENT_ID in der Env prüfen.`;
  }
  return message;
}
