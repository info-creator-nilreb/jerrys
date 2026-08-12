import type { AiOperationErrorCode, AiOperationFailure } from "@/features/integrations/domain/ai-content-assistance";

type OpenAiErrorBody = {
  message?: unknown;
  code?: unknown;
  type?: unknown;
};

function extractOpenAiError(json: unknown): {
  message: string | null;
  code: string | null;
  type: string | null;
} {
  if (!json || typeof json !== "object" || !("error" in json)) {
    return { message: null, code: null, type: null };
  }
  const err = (json as { error?: unknown }).error;
  if (!err || typeof err !== "object") {
    return { message: null, code: null, type: null };
  }
  const e = err as OpenAiErrorBody;
  return {
    message: typeof e.message === "string" ? e.message : null,
    code: typeof e.code === "string" ? e.code : null,
    type: typeof e.type === "string" ? e.type : null,
  };
}

/**
 * Mappt Provider-HTTP-Antworten auf verständliche Admin-Fehler (DE).
 * Keine Roh-Stacktraces; Quoten/Billing/Rate-Limits klar benennen.
 */
export function mapOpenAiHttpFailure(
  status: number,
  json: unknown,
): AiOperationFailure {
  const { message: raw, code, type } = extractOpenAiError(json);
  const lowered = `${code ?? ""} ${type ?? ""} ${raw ?? ""}`.toLowerCase();

  if (
    status === 429 &&
    (lowered.includes("insufficient_quota") ||
      lowered.includes("quota") ||
      lowered.includes("billing") ||
      code === "insufficient_quota")
  ) {
    return {
      ok: false,
      error: "rate_limited",
      message:
        "OpenAI-Kontingent oder Guthaben erschöpft. Bitte Abrechnung im OpenAI-Dashboard prüfen und ggf. Limit erhöhen — danach erneut versuchen.",
    };
  }

  if (status === 429) {
    return {
      ok: false,
      error: "rate_limited",
      message:
        "OpenAI Rate-Limit erreicht. Bitte kurz warten oder das Tageslimit unter Einstellungen → Integrationen prüfen, dann erneut versuchen.",
    };
  }

  if (status === 401 || status === 403 || code === "invalid_api_key") {
    return {
      ok: false,
      error: "not_configured",
      message:
        "OpenAI-API-Key ungültig oder ohne Berechtigung. Bitte Key unter Einstellungen → Integrationen erneuern.",
    };
  }

  if (
    lowered.includes("billing_not_active") ||
    lowered.includes("billing hard limit") ||
    lowered.includes("exceeded your current quota")
  ) {
    return {
      ok: false,
      error: "rate_limited",
      message:
        "OpenAI-Abrechnung ist inaktiv oder das Budget-Limit ist erreicht. Bitte im OpenAI-Dashboard Billing prüfen.",
    };
  }

  if (
    lowered.includes("context_length") ||
    lowered.includes("maximum context") ||
    code === "context_length_exceeded"
  ) {
    return {
      ok: false,
      error: "invalid_request",
      message:
        "Eingabe zu lang für das gewählte Modell. Bitte Prompt kürzen oder ein größeres Modell wählen.",
    };
  }

  if (
    lowered.includes("content_policy") ||
    lowered.includes("safety") ||
    code === "content_policy_violation"
  ) {
    return {
      ok: false,
      error: "moderation_blocked",
      message:
        "OpenAI hat die Anfrage aus Sicherheitsgründen abgelehnt. Bitte Prompt oder Bildinhalt anpassen.",
    };
  }

  if (
    status === 404 ||
    (lowered.includes("model") && lowered.includes("does not exist"))
  ) {
    return {
      ok: false,
      error: "invalid_request",
      message:
        "Das konfigurierte OpenAI-Modell wurde nicht gefunden. Bitte Modellname unter Integrationen prüfen.",
    };
  }

  const fallback =
    raw?.trim() ||
    (status >= 500
      ? `OpenAI ist vorübergehend nicht erreichbar (HTTP ${status}). Bitte später erneut versuchen.`
      : `OpenAI-Anfrage fehlgeschlagen (HTTP ${status}).`);

  return {
    ok: false,
    error:
      status >= 400 && status < 500
        ? ("invalid_request" satisfies AiOperationErrorCode)
        : ("provider_rejected" satisfies AiOperationErrorCode),
    message: humanizeAiProviderMessage(fallback),
  };
}

/** Glättet häufige englische Provider-Fragmente für die Admin-UI. */
export function humanizeAiProviderMessage(message: string): string {
  const t = message.trim();
  if (!t) return "Unbekannter KI-Providerfehler.";

  const lower = t.toLowerCase();
  if (lower.includes("insufficient_quota") || lower.includes("exceeded your current quota")) {
    return "OpenAI-Kontingent erschöpft. Bitte Abrechnung prüfen und erneut versuchen.";
  }
  if (lower.includes("rate limit") || lower.includes("rate_limit")) {
    return "OpenAI Rate-Limit erreicht. Bitte später erneut versuchen.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Die KI-Anfrage ist wegen Timeout abgebrochen. Timeout unter Integrationen erhöhen oder erneut versuchen.";
  }
  if (lower.includes("tageslimit")) {
    return t;
  }
  // Bereits deutsch wirkende Meldungen unverändert lassen.
  if (/[äöüß]/i.test(t) || t.startsWith("OpenAI") || t.startsWith("KI-")) {
    return t.length > 400 ? `${t.slice(0, 397)}…` : t;
  }
  return t.length > 400 ? `${t.slice(0, 397)}…` : t;
}

export function humanizeAiOperationFailure(failure: AiOperationFailure): AiOperationFailure {
  return {
    ...failure,
    message: humanizeAiProviderMessage(failure.message),
  };
}
