import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getObjectStorage,
  ObjectStorageNotConfiguredError,
} from "@/features/integrations";
import { extFromMime } from "@/lib/admin/upload-image";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("catalog.product-image-upload");

/** Vercel/Lambda: nur /tmp beschreibbar — lokale public/-Writes scheitern. */
export function localPublicWritesAllowed(): boolean {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
}

export type PersistProductImageUploadResult =
  | { ok: true; url: string; storage: "blob" | "local" }
  | { ok: false; error: string };

/**
 * Speichert Produktbild-Bytes dauerhaft (Blob bevorzugt, lokal nur außerhalb Vercel).
 */
export async function persistProductImageUpload(input: {
  productId: string;
  bytes: Buffer;
  contentType: string;
}): Promise<PersistProductImageUploadResult> {
  const fileExt = extFromMime(input.contentType);
  if (!fileExt) {
    return { ok: false, error: "Ungültiger Bildtyp." };
  }

  const filename = `${randomUUID()}.${fileExt}`;
  const storage = getObjectStorage();

  if (storage.isConfigured()) {
    try {
      const put = await storage.putPublic({
        pathname: `products/${input.productId}/${filename}`,
        body: input.bytes,
        contentType: input.contentType,
        allowOverwrite: false,
      });
      return { ok: true, url: put.url, storage: "blob" };
    } catch (e) {
      if (!(e instanceof ObjectStorageNotConfiguredError)) {
        log.error("product_image_blob_put_failed", {
          productId: input.productId,
          ...errorMeta(e),
        });
      }
      if (!localPublicWritesAllowed()) {
        return {
          ok: false,
          error:
            "Object Storage ist nicht konfiguriert (BLOB_READ_WRITE_TOKEN) oder Upload fehlgeschlagen.",
        };
      }
    }
  } else if (!localPublicWritesAllowed()) {
    return {
      ok: false,
      error: "Object Storage ist nicht konfiguriert (BLOB_READ_WRITE_TOKEN).",
    };
  }

  if (!localPublicWritesAllowed()) {
    return { ok: false, error: "Upload auf dieser Plattform nicht möglich." };
  }

  try {
    const dir = path.join(process.cwd(), "public", "media", "product-uploads", input.productId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), input.bytes);
    return {
      ok: true,
      url: `/media/product-uploads/${input.productId}/${filename}`,
      storage: "local",
    };
  } catch (e) {
    log.error("product_image_local_write_failed", {
      productId: input.productId,
      ...errorMeta(e),
    });
    return { ok: false, error: "Upload fehlgeschlagen." };
  }
}
