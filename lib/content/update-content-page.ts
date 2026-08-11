import { appendIntegrationOutbox } from "@/features/integrations";
import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { isUniqueViolationError } from "@/lib/db/prisma-error";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import { isContentBlockType } from "@/lib/content/block-types";
import {
  parseContentPageValues,
  type ContentPageValues,
} from "@/lib/content/content-page-schemas";
import {
  getContentPageById,
  type ContentPageDTO,
} from "@/lib/content/content-pages";
import {
  revalidateContentPagesCache,
  updateContentPagesCacheTag,
} from "@/lib/content/content-pages-cache";
import { CONTENT_PAGE_HOME_SLUG } from "@/lib/content/reserved-slugs";
import { sanitizeContentRichTextHtml } from "@/lib/content/sanitize-content-html";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("content-page-update");

export type ContentBlockInput = {
  id?: string | null;
  type: string;
  data: unknown;
};

export type UpdateContentPageResult =
  | { ok: true; page: ContentPageDTO }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Record<string, string>;
    };

function fieldErrorsFromZod(err: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.map(String).join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

function sanitizeBlockData(
  type: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (type === "richText" && typeof data.html === "string") {
    return {
      ...data,
      html: sanitizeContentRichTextHtml(data.html) ?? "",
    };
  }
  return data;
}

export function parseBlocksJson(raw: unknown): {
  ok: true;
  blocks: ContentBlockInput[];
} | {
  ok: false;
  fieldErrors: Record<string, string>;
} {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, fieldErrors: { blocks: "Blöcke ungültig (JSON)." } };
    }
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, fieldErrors: { blocks: "Blöcke müssen eine Liste sein." } };
  }

  const blocks: ContentBlockInput[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        fieldErrors: { [`blocks.${i}`]: "Block ungültig." },
      };
    }
    const rec = item as Record<string, unknown>;
    const type = String(rec.type ?? "");
    if (!isContentBlockType(type)) {
      return {
        ok: false,
        fieldErrors: { [`blocks.${i}.type`]: "Unbekannter Block-Typ." },
      };
    }
    const dataRaw =
      rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)
        ? (rec.data as Record<string, unknown>)
        : {};
    const data = sanitizeBlockData(type, dataRaw);
    const validated = parseContentBlockData(type, data);
    if (!validated.ok) {
      return {
        ok: false,
        fieldErrors: fieldErrorsFromZod(validated.error),
      };
    }
    // curatedProductList rejects placeholder — allow save with empty after filter?
    // Keep validation strict; UI should use real IDs or we soften placeholder.
    blocks.push({
      id: typeof rec.id === "string" ? rec.id : null,
      type,
      data: validated.data,
    });
  }
  return { ok: true, blocks };
}

/**
 * Speichert Seiten-Metadaten und ersetzt die Blockliste atomar (explizites Speichern).
 */
export async function upsertContentPageFromInput(input: {
  id?: string | null;
  values: unknown;
  blocksJson: unknown;
}): Promise<UpdateContentPageResult> {
  const pageParsed = parseContentPageValues(input.values);
  if (!pageParsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(pageParsed.error) };
  }
  const values: ContentPageValues = pageParsed.data;

  const blocksParsed = parseBlocksJson(input.blocksJson);
  if (!blocksParsed.ok) {
    return { ok: false, fieldErrors: blocksParsed.fieldErrors };
  }

  const prisma = getPrisma();

  try {
    if (values.pageType === "homepage") {
      const existingHome = await prisma.contentPage.findFirst({
        where: {
          pageType: "homepage",
          ...(input.id ? { NOT: { id: input.id } } : {}),
        },
        select: { id: true },
      });
      if (existingHome) {
        return {
          ok: false,
          fieldErrors: {
            pageType: "Es darf nur eine Startseiten-CMS-Seite geben.",
          },
        };
      }
      if (values.slug !== CONTENT_PAGE_HOME_SLUG) {
        return {
          ok: false,
          fieldErrors: { slug: `Startseite braucht Slug „${CONTENT_PAGE_HOME_SLUG}“.` },
        };
      }
    }

    const pageId = await prisma.$transaction(async (tx) => {
      let id = input.id?.trim() || null;

      if (id) {
        await tx.contentPage.update({
          where: { id },
          data: {
            slug: values.slug,
            pageType: values.pageType,
            status: values.status,
            title: values.title,
            seoTitle: values.seoTitle,
            seoDescription: values.seoDescription,
            ogImageUrl: values.ogImageUrl,
            canonicalPath: values.canonicalPath,
            robotsIndex: values.robotsIndex,
            previousSlug: values.previousSlug,
            publishedAt:
              values.status === "published"
                ? (await tx.contentPage.findUnique({
                    where: { id },
                    select: { publishedAt: true },
                  }))?.publishedAt ?? new Date()
                : null,
          },
        });
      } else {
        const created = await tx.contentPage.create({
          data: {
            slug: values.slug,
            pageType: values.pageType,
            status: values.status,
            title: values.title,
            seoTitle: values.seoTitle,
            seoDescription: values.seoDescription,
            ogImageUrl: values.ogImageUrl,
            canonicalPath: values.canonicalPath,
            robotsIndex: values.robotsIndex,
            previousSlug: values.previousSlug,
            publishedAt: values.status === "published" ? new Date() : null,
          },
        });
        id = created.id;
      }

      await tx.contentBlock.deleteMany({ where: { pageId: id } });
      if (blocksParsed.blocks.length > 0) {
        await tx.contentBlock.createMany({
          data: blocksParsed.blocks.map((b, index) => ({
            pageId: id!,
            type: b.type,
            sortOrder: index,
            data: b.data as Prisma.InputJsonValue,
          })),
        });
      }

      await appendIntegrationOutbox(tx, {
        aggregateType: "content_page",
        aggregateId: id!,
        eventType: input.id ? "content_page.updated" : "content_page.created",
        payload: {
          slug: values.slug,
          pageType: values.pageType,
          status: values.status,
          blockCount: blocksParsed.blocks.length,
        },
      });

      return id!;
    });

    updateContentPagesCacheTag();
    revalidateContentPagesCache();

    const page = await getContentPageById(pageId);
    if (!page) {
      return { ok: false, error: "Seite nach dem Speichern nicht gefunden." };
    }
    return { ok: true, page };
  } catch (e) {
    if (isUniqueViolationError(e)) {
      return { ok: false, fieldErrors: { slug: "Slug bereits vergeben." } };
    }
    log.error("content_page_upsert_failed", errorMeta(e));
    return { ok: false, error: "Seite konnte nicht gespeichert werden." };
  }
}
