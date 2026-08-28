import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import {
  DEFAULT_HERO_FOCUS_X,
  DEFAULT_HERO_FOCUS_Y,
} from "@/lib/content/blocks/hero";
import { CONTENT_PAGE_HOME_SLUG } from "@/lib/content/reserved-slugs";
import { loadLegalHtmlRaw, type LegalSlug } from "@/lib/legal/load-legal-html";
import { sanitizeLegalDocumentHtml } from "@/lib/legal/sanitize-legal-html";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("content-migrate-storefront");

export const HOME_PAGE_STABLE_ID = "content_page_home";

export const LEGAL_PAGE_DEFS: Array<{
  slug: LegalSlug;
  title: string;
  stableId: string;
  seoDescription: string;
}> = [
  {
    slug: "impressum",
    title: "Impressum",
    stableId: "content_page_legal_impressum",
    seoDescription: "Impressum und Anbieterkennzeichnung",
  },
  {
    slug: "datenschutz",
    title: "Datenschutz",
    stableId: "content_page_legal_datenschutz",
    seoDescription: "Datenschutzerklärung",
  },
  {
    slug: "agb",
    title: "AGB",
    stableId: "content_page_legal_agb",
    seoDescription: "Allgemeine Geschäftsbedingungen",
  },
  {
    slug: "widerruf",
    title: "Widerruf",
    stableId: "content_page_legal_widerruf",
    seoDescription: "Widerrufsbelehrung",
  },
  {
    slug: "versand",
    title: "Versand",
    stableId: "content_page_legal_versand",
    seoDescription: "Zahlung und Versand",
  },
  {
    slug: "rueckgabe",
    title: "Rückgabe",
    stableId: "content_page_legal_rueckgabe",
    seoDescription: "Rückgabeinformationen",
  },
];

function homepageBlocks(): Array<{
  type: string;
  sortOrder: number;
  data: Prisma.InputJsonValue;
}> {
  return [
    {
      type: "hero",
      sortOrder: 0,
      data: {
        eyebrow: "Lieben Katz und Mensch",
        headline: "Katzenhöhle mit Stil",
        imageUrl: "/media/hero-mood.jpg",
        imageAlt: "",
        images: [
          {
            url: "/media/hero-mood.jpg",
            alt: "",
            focusX: DEFAULT_HERO_FOCUS_X,
            focusY: DEFAULT_HERO_FOCUS_Y,
          },
        ],
        slideDurationSec: 6,
        motionEffect: "fade",
        ctaLabel: "Produkte entdecken",
        ctaHref: "/produkte",
      },
    },
    {
      type: "uspStrip",
      sortOrder: 1,
      data: {
        title: "Funktion trifft Design",
        intro:
          "Katzenmöbel, die sich nahtlos in deine vier Wände einfügen – von jerry's, made in Germany.",
        items: [
          {
            icon: "design",
            title: "Ausgezeichnetes Design",
            body: "Funktionalität und zeitloses Design – ausgezeichnet u. a. mit dem Plus X Award.",
          },
          {
            icon: "germany",
            title: "Made in Germany",
            body: "Hochwertige, robuste Materialien und Fertigung in Deutschland für eure Stubentiger.",
          },
          {
            icon: "heart",
            title: "Ein Herz für Tiere",
            body: "Für jedes verkaufte Produkt spenden wir 1 Euro an den Tierschutz.",
          },
        ],
      },
    },
    {
      type: "imageText",
      sortOrder: 2,
      data: {
        title: "Made in Germany",
        body: "Designed und gefertigt in Deutschland – mit Liebe zum Detail und zuverlässiger Qualität für eure Stubentiger.",
        imageUrl: "/media/made-in-germany-banner.png",
        imageAlt:
          "Grafik: bunte Katzen-Silhouetten, in der Mitte der Schriftzug Made in Germany",
        layout: "stacked",
        imagePosition: "left",
        ctaLabel: "",
        ctaHref: "",
      },
    },
    {
      type: "socialReviews",
      sortOrder: 3,
      data: {
        showReviews: true,
        showSocial: false,
        titleReviews: "Das sagen Kund:innen",
        titleSocial: "",
        introSocial: "",
      },
    },
    {
      type: "curatedProductList",
      sortOrder: 4,
      data: {
        title: "Produkte",
        source: "allActive",
        productIds: [],
        limit: 48,
      },
    },
    {
      type: "socialReviews",
      sortOrder: 5,
      data: {
        showReviews: false,
        showSocial: true,
        titleReviews: "",
        titleSocial: "Momente von Instagram",
        introSocial:
          "Einblicke in Stubentiger und jerry's – folgt uns gerne auf Instagram.",
        socialSource: "auto",
        socialDesktopColumns: 4,
        socialDesktopRows: 2,
        socialLimit: 8,
      },
    },
  ];
}

async function replacePageBlocks(
  tx: Prisma.TransactionClient,
  pageId: string,
  blocks: Array<{ type: string; sortOrder: number; data: Prisma.InputJsonValue }>,
) {
  await tx.contentBlock.deleteMany({ where: { pageId } });
  if (blocks.length === 0) return;
  await tx.contentBlock.createMany({
    data: blocks.map((b) => ({
      pageId,
      type: b.type,
      sortOrder: b.sortOrder,
      data: b.data,
    })),
  });
}

async function upsertPublishedPage(
  tx: Prisma.TransactionClient,
  input: {
    stableId: string;
    slug: string;
    pageType: "homepage" | "legal";
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalPath: string;
    blocks: Array<{ type: string; sortOrder: number; data: Prisma.InputJsonValue }>;
  },
): Promise<string> {
  const bySlug = await tx.contentPage.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  const id = bySlug?.id ?? input.stableId;
  const now = new Date();
  const data = {
    slug: input.slug,
    pageType: input.pageType,
    status: "published" as const,
    title: input.title,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    ogImageUrl: null as string | null,
    canonicalPath: input.canonicalPath,
    robotsIndex: true,
    previousSlug: null as string | null,
    publishedAt: now,
  };

  if (bySlug) {
    await tx.contentPage.update({ where: { id: bySlug.id }, data });
  } else {
    await tx.contentPage.create({
      data: { id: input.stableId, ...data },
    });
  }
  await replacePageBlocks(tx, id, input.blocks);
  return id;
}

/**
 * Idempotent: Startseite + Rechtstexte als published ContentPages
 * (Blöcke = aktueller Storefront-Inhalt). Ohne next/cache — sicher für Seed.
 */
export async function migrateStorefrontContentPages(): Promise<{
  ok: true;
  homepageId: string;
  legalCount: number;
}> {
  const prisma = getPrisma();
  try {
    const homepageId = await prisma.$transaction(async (tx) => {
      const homeId = await upsertPublishedPage(tx, {
        stableId: HOME_PAGE_STABLE_ID,
        slug: CONTENT_PAGE_HOME_SLUG,
        pageType: "homepage",
        title: "Startseite",
        seoTitle: null,
        seoDescription: null,
        canonicalPath: "/",
        blocks: homepageBlocks(),
      });

      for (const legal of LEGAL_PAGE_DEFS) {
        const html = sanitizeLegalDocumentHtml(loadLegalHtmlRaw(legal.slug));
        await upsertPublishedPage(tx, {
          stableId: legal.stableId,
          slug: legal.slug,
          pageType: "legal",
          title: legal.title,
          seoTitle: legal.title,
          seoDescription: legal.seoDescription,
          canonicalPath: `/${legal.slug}`,
          blocks: [{ type: "richText", sortOrder: 0, data: { html } }],
        });
      }
      return homeId;
    });

    return {
      ok: true,
      homepageId,
      legalCount: LEGAL_PAGE_DEFS.length,
    };
  } catch (e) {
    log.error("migrate_storefront_content_failed", errorMeta(e));
    throw e;
  }
}
