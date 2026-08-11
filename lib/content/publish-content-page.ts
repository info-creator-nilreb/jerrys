import { appendIntegrationOutbox } from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import {
  getContentPageById,
  type ContentPageDTO,
} from "@/lib/content/content-pages";
import {
  revalidateContentPagesCache,
  updateContentPagesCacheTag,
} from "@/lib/content/content-pages-cache";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("content-page-publish");

export type PublishContentPageResult =
  | { ok: true; page: ContentPageDTO }
  | { ok: false; error: string };

/**
 * Atomare Veröffentlichung: Status `published`, `publishedAt` setzen falls leer.
 */
export async function publishContentPage(
  pageId: string,
): Promise<PublishContentPageResult> {
  const id = pageId.trim();
  if (!id) return { ok: false, error: "Seiten-ID fehlt." };

  const prisma = getPrisma();
  try {
    const existing = await prisma.contentPage.findUnique({
      where: { id },
      select: { id: true, slug: true, pageType: true, status: true, publishedAt: true },
    });
    if (!existing) return { ok: false, error: "Seite nicht gefunden." };

    await prisma.$transaction(async (tx) => {
      await tx.contentPage.update({
        where: { id },
        data: {
          status: "published",
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
      await appendIntegrationOutbox(tx, {
        aggregateType: "content_page",
        aggregateId: id,
        eventType: "content_page.published",
        payload: {
          slug: existing.slug,
          pageType: existing.pageType,
          wasStatus: existing.status,
        },
      });
    });

    updateContentPagesCacheTag();
    revalidateContentPagesCache();

    const page = await getContentPageById(id);
    if (!page) return { ok: false, error: "Seite nach Veröffentlichung nicht gefunden." };
    return { ok: true, page };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, error: "CMS-Schema nicht verfügbar." };
    }
    log.error("content_page_publish_failed", errorMeta(e));
    return { ok: false, error: "Veröffentlichung fehlgeschlagen." };
  }
}

/**
 * Zurück auf Entwurf: Status `draft`, `publishedAt` leeren (nicht öffentlich / nicht indexierbar).
 */
export async function unpublishContentPage(
  pageId: string,
): Promise<PublishContentPageResult> {
  const id = pageId.trim();
  if (!id) return { ok: false, error: "Seiten-ID fehlt." };

  const prisma = getPrisma();
  try {
    const existing = await prisma.contentPage.findUnique({
      where: { id },
      select: { id: true, slug: true, pageType: true, status: true },
    });
    if (!existing) return { ok: false, error: "Seite nicht gefunden." };

    await prisma.$transaction(async (tx) => {
      await tx.contentPage.update({
        where: { id },
        data: {
          status: "draft",
          publishedAt: null,
        },
      });
      await appendIntegrationOutbox(tx, {
        aggregateType: "content_page",
        aggregateId: id,
        eventType: "content_page.unpublished",
        payload: {
          slug: existing.slug,
          pageType: existing.pageType,
          wasStatus: existing.status,
        },
      });
    });

    updateContentPagesCacheTag();
    revalidateContentPagesCache();

    const page = await getContentPageById(id);
    if (!page) return { ok: false, error: "Seite nach Rücknahme nicht gefunden." };
    return { ok: true, page };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return { ok: false, error: "CMS-Schema nicht verfügbar." };
    }
    log.error("content_page_unpublish_failed", errorMeta(e));
    return { ok: false, error: "Veröffentlichung konnte nicht zurückgenommen werden." };
  }
}
