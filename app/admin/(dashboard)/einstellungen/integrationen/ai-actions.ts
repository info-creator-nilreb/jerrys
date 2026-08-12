"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAiContentApiKey,
  getAiContentSettingsPublic,
  getAiContentSettingsSecrets,
  markAiContentSettingsError,
  markAiContentSettingsVerified,
  saveAiContentSettings,
  verifyOpenAiApiKey,
} from "@/features/integrations";
import { getAdminSession } from "@/lib/auth/admin-session";
import { z } from "zod";

export type AiAdminActionState =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
    }
  | null;

const settingsSchema = z.object({
  enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
  apiKey: z.string().trim().max(500).optional(),
  textModel: z.string().trim().min(1).max(120),
  visionModel: z.string().trim().min(1).max(120),
  imageModel: z.string().trim().min(1).max(120),
  moderationModel: z.string().trim().min(1).max(120),
  timeoutMs: z.coerce.number().int().min(5_000).max(120_000),
  dailyRequestLimit: z.coerce.number().int().min(0).max(100_000),
});

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

/**
 * Speichert Modellprofile/Limits und optional einen verschlüsselten API-Key.
 * Prüft den effektiven Key (Env hat Vorrang) via GET /v1/models.
 */
export async function saveAiContentSettingsAction(
  _prev: AiAdminActionState,
  formData: FormData,
): Promise<AiAdminActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    enabled:
      formData.get("enabled") === "on" || formData.get("enabled") === "true"
        ? "true"
        : "false",
    apiKey: String(formData.get("apiKey") ?? "").trim() || undefined,
    textModel: formData.get("textModel"),
    visionModel: formData.get("visionModel"),
    imageModel: formData.get("imageModel"),
    moderationModel: formData.get("moderationModel"),
    timeoutMs: formData.get("timeoutMs"),
    dailyRequestLimit: formData.get("dailyRequestLimit"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." };
  }

  const existing = await getAiContentSettingsPublic();
  const apiKey = parsed.data.apiKey ?? "";

  try {
    await saveAiContentSettings({
      enabled: parsed.data.enabled,
      apiKey,
      keepExistingApiKey: existing.hasDbApiKey && !apiKey,
      textModel: parsed.data.textModel,
      visionModel: parsed.data.visionModel,
      imageModel: parsed.data.imageModel,
      moderationModel: parsed.data.moderationModel,
      timeoutMs: parsed.data.timeoutMs,
      dailyRequestLimit: parsed.data.dailyRequestLimit,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }

  const secrets = await getAiContentSettingsSecrets();
  if (!secrets) {
    revalidatePath("/admin/einstellungen/integrationen");
    return {
      ok: true,
      message: parsed.data.enabled
        ? "Einstellungen gespeichert. Noch kein API-Key (Env oder Admin) — KI bleibt deaktiviert."
        : "Einstellungen gespeichert. KI-Assistent ist deaktiviert.",
    };
  }

  const verify = await verifyOpenAiApiKey({
    apiKey: secrets.apiKey,
    timeoutMs: Math.min(secrets.timeoutMs, 15_000),
  });

  if (!verify.ok) {
    await markAiContentSettingsError(verify.message);
    revalidatePath("/admin/einstellungen/integrationen");
    return {
      ok: true,
      message: `Gespeichert, aber Prüfung fehlgeschlagen: ${verify.message}`,
    };
  }

  await markAiContentSettingsVerified();
  revalidatePath("/admin/einstellungen/integrationen");
  return {
    ok: true,
    message:
      secrets.source === "env"
        ? "Gespeichert und geprüft (API-Key aus Env)."
        : "Gespeichert und geprüft (API-Key aus Admin).",
  };
}

export async function clearAiContentApiKeyAction(
  _prev: AiAdminActionState,
  _formData: FormData,
): Promise<AiAdminActionState> {
  await requireAdmin();
  try {
    await clearAiContentApiKey();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
  revalidatePath("/admin/einstellungen/integrationen");
  return {
    ok: true,
    message: "Admin-API-Key entfernt. Env-Key (falls gesetzt) bleibt aktiv.",
  };
}
