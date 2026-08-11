"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  isShopBrandingAssetKind,
  type ShopBrandingAssetKind,
} from "@/lib/shop/branding-asset-kinds";
import { getShopSettings, type ShopSettingsDTO } from "@/lib/shop/shop-settings";
import {
  clearShopBrandingAsset,
  uploadShopBrandingAsset,
} from "@/lib/shop/upload-shop-branding-asset";
import {
  shopSettingsInputFromFormData,
  updateShopSettingsFromInput,
} from "@/lib/shop/update-shop-settings";

const log = createLogger("admin-einstellungen");

export type ShopSettingsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  contrastWarnings?: string[];
} | null;

export type BrandingAssetFormState = {
  error?: string;
  ok?: boolean;
  kind?: ShopBrandingAssetKind;
} | null;

async function requireAdminSession(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

export async function getShopSettingsForAdminForm(): Promise<ShopSettingsDTO> {
  await requireAdminSession();
  return getShopSettings();
}

export async function saveShopSettingsAction(
  _prev: ShopSettingsFormState,
  formData: FormData,
): Promise<ShopSettingsFormState> {
  await requireAdminSession();

  const result = await updateShopSettingsFromInput(shopSettingsInputFromFormData(formData));
  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/admin/einstellungen");
  return {
    ok: true,
    contrastWarnings: result.contrastWarnings,
  };
}

export async function uploadShopBrandingAssetAction(
  _prev: BrandingAssetFormState,
  formData: FormData,
): Promise<BrandingAssetFormState> {
  await requireAdminSession();

  const kindRaw = String(formData.get("kind") ?? "").trim();
  if (!isShopBrandingAssetKind(kindRaw)) {
    return { error: "Unbekannter Asset-Typ." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Datei auswählen.", kind: kindRaw };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadShopBrandingAsset({
      kind: kindRaw,
      bytes,
      declaredMime: file.type || null,
    });
    if (!result.ok) {
      return { error: result.error, kind: kindRaw };
    }
    revalidatePath("/admin/einstellungen");
    return { ok: true, kind: kindRaw };
  } catch (e) {
    log.error("admin_branding_upload_failed", { kind: kindRaw, ...errorMeta(e) });
    return { error: "Upload fehlgeschlagen.", kind: kindRaw };
  }
}

export async function clearShopBrandingAssetAction(
  _prev: BrandingAssetFormState,
  formData: FormData,
): Promise<BrandingAssetFormState> {
  await requireAdminSession();

  const kindRaw = String(formData.get("kind") ?? "").trim();
  if (!isShopBrandingAssetKind(kindRaw)) {
    return { error: "Unbekannter Asset-Typ." };
  }

  const result = await clearShopBrandingAsset(kindRaw);
  if (!result.ok) {
    return { error: result.error, kind: kindRaw };
  }
  revalidatePath("/admin/einstellungen");
  return { ok: true, kind: kindRaw };
}
