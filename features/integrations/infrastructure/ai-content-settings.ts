import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

export const AI_CONTENT_SETTINGS_ID = "default" as const;

export type AiContentSettingsPublic = {
  /** DB-Zeile vorhanden und (Key in DB oder Env). */
  configured: boolean;
  enabled: boolean;
  /** Key in DB gespeichert (nicht Env). */
  hasDbApiKey: boolean;
  /** OPENAI_API_KEY in Env gesetzt. */
  envApiKeyConfigured: boolean;
  apiKeyMasked: string | null;
  textModel: string;
  visionModel: string;
  imageModel: string;
  moderationModel: string;
  timeoutMs: number;
  dailyRequestLimit: number;
  requestsUsedToday: number;
  requestsDayKey: string;
  connectedAt: Date | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  /** enabled + Key verfügbar. */
  ready: boolean;
};

export type AiContentSettingsSecrets = {
  apiKey: string;
  source: "env" | "db";
  enabled: boolean;
  textModel: string;
  visionModel: string;
  imageModel: string;
  moderationModel: string;
  timeoutMs: number;
  dailyRequestLimit: number;
};

function maskApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 8) return "••••";
  return `${t.slice(0, 3)}…${t.slice(-4)}`;
}

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function envApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const k = env.OPENAI_API_KEY?.trim();
  return k || null;
}

const EMPTY_PUBLIC: AiContentSettingsPublic = {
  configured: false,
  enabled: true,
  hasDbApiKey: false,
  envApiKeyConfigured: false,
  apiKeyMasked: null,
  textModel: "gpt-4o-mini",
  visionModel: "gpt-4o-mini",
  imageModel: "dall-e-3",
  moderationModel: "omni-moderation-latest",
  timeoutMs: 30_000,
  dailyRequestLimit: 100,
  requestsUsedToday: 0,
  requestsDayKey: "",
  connectedAt: null,
  lastVerifiedAt: null,
  lastError: null,
  ready: false,
};

function normalizeUsage(row: {
  requestsUsedToday: number;
  requestsDayKey: string;
}): { requestsUsedToday: number; requestsDayKey: string } {
  const today = utcDayKey();
  if (row.requestsDayKey !== today) {
    return { requestsUsedToday: 0, requestsDayKey: today };
  }
  return {
    requestsUsedToday: row.requestsUsedToday,
    requestsDayKey: row.requestsDayKey,
  };
}

export async function getAiContentSettingsPublic(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiContentSettingsPublic> {
  const envKey = envApiKey(env);
  try {
    const row = await getPrisma().aiContentSettings.findUnique({
      where: { id: AI_CONTENT_SETTINGS_ID },
    });
    if (!row) {
      return {
        ...EMPTY_PUBLIC,
        envApiKeyConfigured: envKey != null,
        configured: envKey != null,
        apiKeyMasked: envKey ? maskApiKey(envKey) : null,
        ready: envKey != null,
      };
    }

    const usage = normalizeUsage(row);
    const hasDbApiKey = Boolean(row.apiKeyEnc);
    const effectiveKey = envKey ?? (hasDbApiKey ? "db" : null);
    const apiKeyMasked = envKey
      ? maskApiKey(envKey)
      : hasDbApiKey
        ? "•••• (Admin)"
        : null;

    return {
      configured: effectiveKey != null,
      enabled: row.enabled,
      hasDbApiKey,
      envApiKeyConfigured: envKey != null,
      apiKeyMasked,
      textModel: row.textModel,
      visionModel: row.visionModel,
      imageModel: row.imageModel,
      moderationModel: row.moderationModel,
      timeoutMs: row.timeoutMs,
      dailyRequestLimit: row.dailyRequestLimit,
      requestsUsedToday: usage.requestsUsedToday,
      requestsDayKey: usage.requestsDayKey,
      connectedAt: row.connectedAt,
      lastVerifiedAt: row.lastVerifiedAt,
      lastError: row.lastError,
      ready: row.enabled && effectiveKey != null,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return {
        ...EMPTY_PUBLIC,
        envApiKeyConfigured: envKey != null,
        configured: envKey != null,
        apiKeyMasked: envKey ? maskApiKey(envKey) : null,
        ready: envKey != null,
      };
    }
    throw e;
  }
}

/**
 * Effektive Secrets: Env-Key hat Vorrang vor DB; Modellprofile/Limits aus DB wenn vorhanden.
 */
export async function getAiContentSettingsSecrets(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiContentSettingsSecrets | null> {
  const envKey = envApiKey(env);
  try {
    const row = await getPrisma().aiContentSettings.findUnique({
      where: { id: AI_CONTENT_SETTINGS_ID },
    });

    let dbKey: string | null = null;
    if (row?.apiKeyEnc) {
      try {
        dbKey = decryptSecret(row.apiKeyEnc);
      } catch {
        dbKey = null;
      }
    }

    const apiKey = envKey ?? dbKey;
    if (!apiKey) return null;

    const enabled = row?.enabled ?? true;
    if (!enabled) return null;

    return {
      apiKey,
      source: envKey ? "env" : "db",
      enabled,
      textModel: row?.textModel ?? env.OPENAI_TEXT_MODEL?.trim() ?? "gpt-4o-mini",
      visionModel: row?.visionModel ?? env.OPENAI_VISION_MODEL?.trim() ?? "gpt-4o-mini",
      imageModel: row?.imageModel ?? env.OPENAI_IMAGE_MODEL?.trim() ?? "dall-e-3",
      moderationModel:
        row?.moderationModel ?? env.OPENAI_MODERATION_MODEL?.trim() ?? "omni-moderation-latest",
      timeoutMs: row?.timeoutMs ?? 30_000,
      dailyRequestLimit: row?.dailyRequestLimit ?? 100,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      if (!envKey) return null;
      return {
        apiKey: envKey,
        source: "env",
        enabled: true,
        textModel: env.OPENAI_TEXT_MODEL?.trim() ?? "gpt-4o-mini",
        visionModel: env.OPENAI_VISION_MODEL?.trim() ?? "gpt-4o-mini",
        imageModel: env.OPENAI_IMAGE_MODEL?.trim() ?? "dall-e-3",
        moderationModel: env.OPENAI_MODERATION_MODEL?.trim() ?? "omni-moderation-latest",
        timeoutMs: 30_000,
        dailyRequestLimit: 100,
      };
    }
    throw e;
  }
}

export type SaveAiContentSettingsInput = {
  enabled: boolean;
  apiKey?: string;
  keepExistingApiKey: boolean;
  textModel: string;
  visionModel: string;
  imageModel: string;
  moderationModel: string;
  timeoutMs: number;
  dailyRequestLimit: number;
};

export async function saveAiContentSettings(input: SaveAiContentSettingsInput): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.aiContentSettings.findUnique({
    where: { id: AI_CONTENT_SETTINGS_ID },
  });

  const nextKey = input.apiKey?.trim() ?? "";
  let apiKeyEnc: string | null | undefined;
  if (nextKey) {
    apiKeyEnc = encryptSecret(nextKey);
  } else if (input.keepExistingApiKey && existing?.apiKeyEnc) {
    apiKeyEnc = existing.apiKeyEnc;
  } else if (!input.keepExistingApiKey && !nextKey) {
    apiKeyEnc = existing?.apiKeyEnc ?? null;
  }

  const hasKey = Boolean(apiKeyEnc) || Boolean(envApiKey());
  if (!hasKey && input.enabled) {
    // Speichern von Profilen ohne Key ist ok; ready bleibt false.
  }

  await prisma.aiContentSettings.upsert({
    where: { id: AI_CONTENT_SETTINGS_ID },
    create: {
      id: AI_CONTENT_SETTINGS_ID,
      enabled: input.enabled,
      apiKeyEnc: apiKeyEnc ?? null,
      textModel: input.textModel,
      visionModel: input.visionModel,
      imageModel: input.imageModel,
      moderationModel: input.moderationModel,
      timeoutMs: input.timeoutMs,
      dailyRequestLimit: input.dailyRequestLimit,
      connectedAt: apiKeyEnc ? new Date() : null,
    },
    update: {
      enabled: input.enabled,
      ...(apiKeyEnc !== undefined ? { apiKeyEnc } : {}),
      textModel: input.textModel,
      visionModel: input.visionModel,
      imageModel: input.imageModel,
      moderationModel: input.moderationModel,
      timeoutMs: input.timeoutMs,
      dailyRequestLimit: input.dailyRequestLimit,
      ...(nextKey
        ? { connectedAt: new Date(), lastError: null }
        : {}),
    },
  });
}

export async function markAiContentSettingsVerified(): Promise<void> {
  await getPrisma().aiContentSettings.upsert({
    where: { id: AI_CONTENT_SETTINGS_ID },
    create: {
      id: AI_CONTENT_SETTINGS_ID,
      lastVerifiedAt: new Date(),
      lastError: null,
      connectedAt: new Date(),
    },
    update: {
      lastVerifiedAt: new Date(),
      lastError: null,
    },
  });
}

export async function markAiContentSettingsError(message: string): Promise<void> {
  await getPrisma().aiContentSettings.upsert({
    where: { id: AI_CONTENT_SETTINGS_ID },
    create: {
      id: AI_CONTENT_SETTINGS_ID,
      lastError: message.slice(0, 2000),
    },
    update: {
      lastError: message.slice(0, 2000),
    },
  });
}

export async function clearAiContentApiKey(): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.aiContentSettings.findUnique({
    where: { id: AI_CONTENT_SETTINGS_ID },
  });
  if (!existing) return;
  await prisma.aiContentSettings.update({
    where: { id: AI_CONTENT_SETTINGS_ID },
    data: {
      apiKeyEnc: null,
      lastVerifiedAt: null,
      lastError: null,
      connectedAt: null,
    },
  });
}

/**
 * Atomarer Tageskontingent-Check + Increment (UTC).
 * limit 0 = unbegrenzt.
 */
export async function consumeAiContentRequestQuota(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const prisma = getPrisma();
  const today = utcDayKey();

  try {
    const row = await prisma.aiContentSettings.findUnique({
      where: { id: AI_CONTENT_SETTINGS_ID },
    });

    const limit = row?.dailyRequestLimit ?? 100;
    if (limit <= 0) {
      if (!row) {
        await prisma.aiContentSettings.create({
          data: {
            id: AI_CONTENT_SETTINGS_ID,
            requestsDayKey: today,
            requestsUsedToday: 1,
          },
        });
      } else if (row.requestsDayKey !== today) {
        await prisma.aiContentSettings.update({
          where: { id: AI_CONTENT_SETTINGS_ID },
          data: { requestsDayKey: today, requestsUsedToday: 1 },
        });
      } else {
        await prisma.aiContentSettings.update({
          where: { id: AI_CONTENT_SETTINGS_ID },
          data: { requestsUsedToday: { increment: 1 } },
        });
      }
      return { ok: true };
    }

    if (!row) {
      await prisma.aiContentSettings.create({
        data: {
          id: AI_CONTENT_SETTINGS_ID,
          requestsDayKey: today,
          requestsUsedToday: 1,
          dailyRequestLimit: limit,
        },
      });
      return { ok: true };
    }

    const used = row.requestsDayKey === today ? row.requestsUsedToday : 0;
    if (used >= limit) {
      return {
        ok: false,
        message: `Tageslimit für KI-Anfragen erreicht (${limit}/Tag, UTC). Limit unter Integrationen erhöhen oder morgen erneut versuchen.`,
      };
    }

    await prisma.aiContentSettings.update({
      where: { id: AI_CONTENT_SETTINGS_ID },
      data:
        row.requestsDayKey === today
          ? { requestsUsedToday: { increment: 1 } }
          : { requestsDayKey: today, requestsUsedToday: 1 },
    });
    return { ok: true };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      // Ohne Migration kein hartes Limit — Generierung nicht blockieren.
      return { ok: true };
    }
    throw e;
  }
}

/**
 * Prüft API-Key leichtgewichtig — nicht GET /v1/models (komplette Liste, oft Timeout).
 * Primär: GET /v1/models/{model}; Fallback: POST /v1/moderations mit kurzem Text.
 */
export async function verifyOpenAiApiKey(options: {
  apiKey: string;
  baseUrl?: string;
  /** Bevorzugtes Modell für den Lookup (Default: gpt-4o-mini). */
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? 30_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = encodeURIComponent((options.model?.trim() || "gpt-4o-mini").slice(0, 120));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${baseUrl}/models/${model}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${options.apiKey}` },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "OpenAI-API-Key ungültig oder ohne Berechtigung." };
    }
    if (res.ok) return { ok: true };

    // Fallback: Moderations-Endpoint (klein, zuverlässig für Key-Validierung).
    const mod = await fetchImpl(`${baseUrl}/moderations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: "ping" }),
      signal: controller.signal,
    });
    if (mod.status === 401 || mod.status === 403) {
      return { ok: false, message: "OpenAI-API-Key ungültig oder ohne Berechtigung." };
    }
    if (!mod.ok) {
      return {
        ok: false,
        message: `OpenAI-Prüfung fehlgeschlagen (HTTP ${mod.status}).`,
      };
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        ok: false,
        message:
          "OpenAI-Prüfung wegen Timeout abgebrochen. Netzwerk/Firewall prüfen oder Timeout erhöhen und erneut speichern.",
      };
    }
    return {
      ok: false,
      message: e instanceof Error ? e.message : "OpenAI-Prüfung fehlgeschlagen.",
    };
  } finally {
    clearTimeout(timer);
  }
}
