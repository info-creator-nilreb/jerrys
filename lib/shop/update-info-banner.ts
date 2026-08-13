import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { ensureShopSettingsColumns } from "@/lib/shop/ensure-shop-settings-columns";
import {
  INFO_BANNER_MAX_MESSAGES,
  INFO_BANNER_MESSAGE_MAX_LEN,
  parseInfoBannerBgColorInput,
  parseInfoBannerDurationSec,
  parseInfoBannerMessages,
} from "@/lib/shop/info-banner";
import {
  getShopSettings,
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  SHOP_SETTINGS_DEFAULT_ID,
  type ShopSettingsDTO,
} from "@/lib/shop/shop-settings";
import {
  revalidateShopSettingsCache,
  revalidateStorefrontBranding,
  updateShopSettingsCacheTag,
} from "@/lib/shop/shop-settings-cache";

const log = createLogger("info-banner-update");

export type UpdateInfoBannerResult =
  | { ok: true; settings: ShopSettingsDTO }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function formActiveFlag(formData: FormData, key: string): boolean {
  const raw = formData.get(key);
  if (raw == null) return false;
  const v = String(raw);
  return v === "true" || v === "on" || v === "1";
}

function parseOptionalHref(raw: string):
  | { ok: true; href: string | null }
  | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true, href: null };
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (t.length > 200) return { ok: false, message: "Pfad zu lang." };
    return { ok: true, href: t };
  }
  if (t.startsWith("https://")) {
    try {
      new URL(t);
    } catch {
      return { ok: false, message: "Ungültige HTTPS-URL." };
    }
    if (t.length > 500) return { ok: false, message: "URL zu lang." };
    return { ok: true, href: t };
  }
  return { ok: false, message: "Nur interner Pfad (/…) oder HTTPS-URL." };
}

export function infoBannerInputFromFormData(formData: FormData): {
  active: boolean;
  messages: string[];
  durationSec: number;
  hrefRaw: string;
  bgColorRaw: string;
} {
  const messages: string[] = [];
  for (let i = 0; i < INFO_BANNER_MAX_MESSAGES; i++) {
    const v = String(formData.get(`message${i}`) ?? "").trim();
    if (v) messages.push(v.slice(0, INFO_BANNER_MESSAGE_MAX_LEN));
  }
  return {
    active: formActiveFlag(formData, "infoBannerActive"),
    messages: parseInfoBannerMessages(messages),
    durationSec: parseInfoBannerDurationSec(formData.get("infoBannerDurationSec")),
    hrefRaw: String(formData.get("infoBannerHref") ?? ""),
    bgColorRaw: String(formData.get("infoBannerBgColor") ?? "primary"),
  };
}

export async function updateInfoBannerFromFormData(
  formData: FormData,
): Promise<UpdateInfoBannerResult> {
  const input = infoBannerInputFromFormData(formData);
  const fieldErrors: Record<string, string> = {};

  if (input.active && input.messages.length === 0) {
    fieldErrors.messages = "Mindestens einen Text pflegen oder Banner deaktivieren.";
  }
  const hrefParsed = parseOptionalHref(input.hrefRaw);
  if (!hrefParsed.ok) {
    fieldErrors.infoBannerHref = hrefParsed.message;
  }
  const bgParsed = parseInfoBannerBgColorInput(input.bgColorRaw);
  if (!bgParsed.ok) {
    fieldErrors.infoBannerBgColor = bgParsed.message;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const href = hrefParsed.ok ? hrefParsed.href : null;
  const bgColor = bgParsed.ok ? bgParsed.color : null;
  const d = JERRYS_SHOP_SETTINGS_DEFAULTS;

  try {
    await ensureShopSettingsColumns();
    const prisma = getPrisma();
    await prisma.shopSettings.upsert({
      where: { id: SHOP_SETTINGS_DEFAULT_ID },
      create: {
        id: SHOP_SETTINGS_DEFAULT_ID,
        shopName: d.shopName,
        shortDescription: d.shortDescription,
        primaryColor: d.primaryColor,
        primaryHoverColor: d.primaryHoverColor,
        infoBannerActive: input.active,
        infoBannerMessages: input.messages,
        infoBannerDurationSec: input.durationSec,
        infoBannerHref: href,
        infoBannerBgColor: bgColor,
      },
      update: {
        infoBannerActive: input.active,
        infoBannerMessages: input.messages,
        infoBannerDurationSec: input.durationSec,
        infoBannerHref: href,
        infoBannerBgColor: bgColor,
      },
    });

    updateShopSettingsCacheTag();
    revalidateShopSettingsCache();
    revalidateStorefrontBranding();
    revalidatePath("/admin/inhalte/info-banner");

    return { ok: true, settings: await getShopSettings() };
  } catch (e) {
    log.error("info_banner_update_failed", errorMeta(e));
    if (isMissingSchemaError(e)) {
      return {
        ok: false,
        error:
          "Datenbank-Schema ist nicht aktuell. Bitte Migration deployen: npm run db:migrate:deploy",
      };
    }
    return { ok: false, error: "Info-Banner konnte nicht gespeichert werden." };
  }
}
