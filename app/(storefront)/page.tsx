import type { Metadata } from "next";
import { ContentBlocksRenderer } from "@/components/content/content-blocks-renderer";
import { metadataForContentPage } from "@/lib/content/content-page-metadata";
import { getHomepageContentPage } from "@/lib/content/content-pages";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";

export const dynamic = "force-dynamic";

/**
 * Startseite: SEO/Canonical/Index aus published CMS-Homepage (Epic 12 / Epic 14 Slice 1).
 * Fallback: Root-Metadata aus ShopSettings.
 */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getHomepageContentPage();
  if (page?.status === "published") {
    return metadataForContentPage(page);
  }
  return {};
}

/**
 * Startseite aus CMS (`pageType: homepage`, published).
 * Ohne published CMS-Zeile: Hinweis (Migration/Seed ausführen).
 */
export default async function StorefrontHomePage() {
  const page = await getHomepageContentPage();
  if (page?.status === "published") {
    return <ContentBlocksRenderer blocks={page.blocks} pageType="homepage" />;
  }

  return (
    <div className={`mx-auto max-w-3xl px-4 text-center ${storefrontMainPagePaddingClass}`}>
      <h1 className="text-2xl font-semibold text-(--foreground-heading)">Startseite</h1>
      <p className="mt-4 text-(--foreground-muted)">
        Die Startseite wird über Inhalte (CMS) ausgeliefert. Bitte die Storefront-Migration
        ausführen oder die Homepage unter Admin → Inhalte veröffentlichen.
      </p>
    </div>
  );
}
