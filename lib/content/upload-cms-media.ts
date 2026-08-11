import { randomUUID } from "node:crypto";
import {
  appendIntegrationOutbox,
  getObjectStorage,
  ObjectStorageNotConfiguredError,
} from "@/features/integrations";
import { validateCmsMediaUpload } from "@/lib/content/cms-media-validation";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("cms-media-upload");

export type UploadCmsMediaResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

/**
 * CMS-Bild nach Object Storage (ADR-0008) und `content_media_assets`.
 */
export async function uploadCmsMediaAsset(input: {
  bytes: Buffer;
  declaredMime?: string | null;
  fileName?: string | null;
  alt?: string | null;
}): Promise<UploadCmsMediaResult> {
  const validated = validateCmsMediaUpload(input.bytes, input.declaredMime);
  if (!validated.ok) return validated;

  const storage = getObjectStorage();
  if (!storage.isConfigured()) {
    return {
      ok: false,
      error: "Object Storage ist nicht konfiguriert (BLOB_READ_WRITE_TOKEN).",
    };
  }

  const pathname = `cms/media/${randomUUID()}.${validated.ext}`;
  let putUrl: string;
  try {
    const put = await storage.putPublic({
      pathname,
      body: validated.bytes,
      contentType: validated.contentType,
    });
    putUrl = put.url;
  } catch (e) {
    if (e instanceof ObjectStorageNotConfiguredError) {
      return { ok: false, error: e.message };
    }
    log.error("cms_media_blob_put_failed", errorMeta(e));
    return { ok: false, error: "Upload in Object Storage fehlgeschlagen." };
  }

  const prisma = getPrisma();
  try {
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.contentMediaAsset.create({
        data: {
          url: putUrl,
          alt: input.alt?.trim() ?? "",
          fileName: input.fileName?.trim() || null,
        },
      });
      await appendIntegrationOutbox(tx, {
        aggregateType: "content_media",
        aggregateId: created.id,
        eventType: "content_media.uploaded",
        payload: { url: putUrl, pathname },
      });
      return created;
    });
    return { ok: true, id: row.id, url: row.url };
  } catch (e) {
    log.error("cms_media_db_failed", errorMeta(e));
    try {
      await storage.deleteByUrl(putUrl);
    } catch {
      // best-effort cleanup
    }
    return { ok: false, error: "Medien-Eintrag konnte nicht gespeichert werden." };
  }
}
