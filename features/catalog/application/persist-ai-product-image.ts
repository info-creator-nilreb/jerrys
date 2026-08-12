import "server-only";

import { randomUUID } from "node:crypto";
import {
  createAiContentPort,
  getObjectStorage,
  ObjectStorageNotConfiguredError,
} from "@/features/integrations";
import { MAX_UPLOAD_BYTES } from "@/lib/admin/upload-image";
import { getPrisma } from "@/lib/db/prisma";
import {
  detectImageFormat,
  extForImageFormat,
  mimeForImageFormat,
} from "@/lib/shop/branding-asset-validation";

export type PersistAiProductImageResult =
  | { ok: true; imageId: string; url: string; alt: string }
  | { ok: false; error: string; code?: string };

async function loadImageBytes(input: {
  temporaryImageUrl?: string | null;
  temporaryImageBase64?: string | null;
}): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  if (input.temporaryImageBase64?.trim()) {
    try {
      const bytes = Buffer.from(input.temporaryImageBase64.trim(), "base64");
      if (!bytes.length) return { ok: false, error: "Leeres Bild (Base64)." };
      return { ok: true, bytes };
    } catch {
      return { ok: false, error: "Base64-Bild ungültig." };
    }
  }

  const url = input.temporaryImageUrl?.trim();
  if (!url) {
    return { ok: false, error: "Kein temporäres Bild vorhanden." };
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      return { ok: false, error: `Temporäres Bild nicht ladbar (HTTP ${res.status}).` };
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) return { ok: false, error: "Leeres Bild vom Provider." };
    return { ok: true, bytes };
  } catch {
    return { ok: false, error: "Download des temporären Bildes fehlgeschlagen." };
  }
}

/**
 * Moderiert erneut, speichert dauerhaft in Object Storage und legt ProductImage an.
 * Kein Auto-Publish über diesen Pfad hinaus — Bild erscheint in der Galerie.
 */
export async function persistAiGeneratedProductImage(input: {
  productId: string;
  temporaryImageUrl?: string | null;
  temporaryImageBase64?: string | null;
  alt: string;
  skipModeration?: boolean;
}): Promise<PersistAiProductImageResult> {
  const alt = input.alt.trim().slice(0, 200);
  if (!alt) {
    return { ok: false, error: "Alt-Text ist Pflicht vor der Übernahme.", code: "invalid_request" };
  }

  const product = await getPrisma().product.findUnique({
    where: { id: input.productId },
    select: { id: true, slug: true, title: true },
  });
  if (!product) {
    return { ok: false, error: "Produkt nicht gefunden.", code: "invalid_request" };
  }

  const loaded = await loadImageBytes(input);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error, code: "invalid_request" };
  }

  if (loaded.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Bild zu groß (max. ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`,
      code: "invalid_request",
    };
  }

  const format = detectImageFormat(loaded.bytes);
  if (format !== "jpeg" && format !== "png" && format !== "webp") {
    return {
      ok: false,
      error: "Nur JPEG, PNG oder WEBP nach Generierung erlaubt.",
      code: "invalid_request",
    };
  }

  const contentType = mimeForImageFormat(format);
  const ext = extForImageFormat(format);

  if (!input.skipModeration) {
    const port = await createAiContentPort();
    if (port.isConfigured() && port.supports("moderation")) {
      const previewSrc = input.temporaryImageUrl?.trim()
        ? input.temporaryImageUrl.trim()
        : `data:${contentType};base64,${loaded.bytes.toString("base64")}`;
      const mod = await port.moderate({ imageUrl: previewSrc });
      if (mod.ok && mod.flagged) {
        return {
          ok: false,
          error: `Übernahme blockiert — Moderation: ${mod.categories.join(", ") || "policy"}.`,
          code: "moderation_blocked",
        };
      }
    }
  }

  const storage = getObjectStorage();
  if (!storage.isConfigured()) {
    return {
      ok: false,
      error:
        "Object Storage ist nicht konfiguriert (BLOB_READ_WRITE_TOKEN). KI-Bilder können nicht dauerhaft gespeichert werden.",
      code: "not_configured",
    };
  }

  const filename = `${randomUUID()}.${ext}`;
  let url: string;
  try {
    const put = await storage.putPublic({
      pathname: `products/${product.id}/${filename}`,
      body: loaded.bytes,
      contentType,
      allowOverwrite: false,
    });
    url = put.url;
  } catch (e) {
    if (e instanceof ObjectStorageNotConfiguredError) {
      return { ok: false, error: e.message, code: "not_configured" };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Blob-Upload fehlgeschlagen.",
      code: "provider_rejected",
    };
  }

  const maxSort = await getPrisma().productImage.aggregate({
    where: { productId: product.id },
    _max: { sortOrder: true },
  });
  const nextOrder = (maxSort._max.sortOrder ?? -1) + 1;
  const countBefore = await getPrisma().productImage.count({
    where: { productId: product.id },
  });

  const row = await getPrisma().productImage.create({
    data: {
      productId: product.id,
      url,
      alt,
      sortOrder: nextOrder,
      isCover: countBefore === 0,
    },
  });

  return { ok: true, imageId: row.id, url, alt };
}
