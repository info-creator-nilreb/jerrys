import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  brandingAssetMimeType,
  resolveShopBrandingAssetUrl,
} from "@/lib/shop/branding-asset-fallbacks";
import { getShopSettings } from "@/lib/shop/shop-settings";

export const dynamic = "force-dynamic";

export const size = { width: 32, height: 32 };

export default async function Icon() {
  const settings = await getShopSettings();
  const faviconPath = resolveShopBrandingAssetUrl(settings, "favicon");
  const mimeType = brandingAssetMimeType(faviconPath);

  if (faviconPath.startsWith("/")) {
    const filePath = path.join(process.cwd(), "public", faviconPath.slice(1));
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: { "Content-Type": mimeType },
    });
  }

  const response = await fetch(faviconPath);
  if (!response.ok) {
    throw new Error(`Favicon konnte nicht geladen werden: ${faviconPath}`);
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? mimeType,
    },
  });
}
