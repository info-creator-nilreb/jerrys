import fs from "node:fs";
import path from "node:path";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import { getShopSettings, type ShopSettingsDTO } from "@/lib/shop/shop-settings";

export type InvoiceLogoEmbed =
  | { kind: "jpg"; bytes: Uint8Array }
  | { kind: "png"; bytes: Uint8Array };

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function toEmbed(bytes: Uint8Array): InvoiceLogoEmbed | null {
  if (isPng(bytes)) return { kind: "png", bytes };
  if (isJpeg(bytes)) return { kind: "jpg", bytes };
  return null;
}

async function loadBytesFromUrlOrPath(urlOrPath: string): Promise<Uint8Array | null> {
  try {
    if (urlOrPath.startsWith("https://") || urlOrPath.startsWith("http://")) {
      const res = await fetch(urlOrPath);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    }
    if (urlOrPath.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", urlOrPath.replace(/^\//, ""));
      if (!fs.existsSync(filePath)) return null;
      return new Uint8Array(fs.readFileSync(filePath));
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Logo für PDF: Settings-URL oder Static-Fallback. Bei Fehler `null` (PDF ohne Logo).
 */
export async function loadInvoiceLogoEmbed(
  settings?: ShopSettingsDTO | null,
): Promise<InvoiceLogoEmbed | null> {
  const resolved =
    settings != null
      ? resolveShopBrandingAssetUrl(settings, "logoLight")
      : "/branding/jerrys-wordmark.jpg";
  const bytes = await loadBytesFromUrlOrPath(resolved);
  if (!bytes) {
    const fallback = await loadBytesFromUrlOrPath("/branding/jerrys-wordmark.jpg");
    return fallback ? toEmbed(fallback) : null;
  }
  return toEmbed(bytes);
}

export type InvoiceSellerFromSettings = {
  lines: string[];
  ustId?: string;
};

export function invoiceSellerLinesFromSettings(settings: ShopSettingsDTO): InvoiceSellerFromSettings {
  const lines = [
    settings.legalName?.trim() || settings.shopName || JERRYS_SHOP_SETTINGS_DEFAULTS.shopName,
    settings.addressLine1?.trim(),
    settings.addressLine2?.trim(),
    [settings.addressZip?.trim(), settings.addressCity?.trim()].filter(Boolean).join(" "),
    settings.addressCountry?.trim() === "DE" ? undefined : settings.addressCountry?.trim(),
  ].filter((l): l is string => Boolean(l && l.length > 0));

  return {
    lines: lines.length ? lines : [JERRYS_SHOP_SETTINGS_DEFAULTS.shopName],
    ustId: settings.vatId?.trim() || undefined,
  };
}

export async function loadShopSettingsForInvoice(): Promise<ShopSettingsDTO | null> {
  try {
    return await getShopSettings();
  } catch {
    return null;
  }
}
