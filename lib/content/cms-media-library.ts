import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { getShopSettings } from "@/lib/shop/shop-settings";

export type CmsMediaLibraryItem = {
  id: string;
  url: string;
  label: string;
  source: "upload" | "static" | "social" | "branding";
};

/** Statische Storefront-Assets unter /public/media (Picker). */
export const STATIC_CMS_MEDIA: CmsMediaLibraryItem[] = [
  {
    id: "static_hero_mood",
    url: "/media/hero-mood.jpg",
    label: "Hero Mood",
    source: "static",
  },
  {
    id: "static_made_in_germany",
    url: "/media/made-in-germany-banner.png",
    label: "Made in Germany Banner",
    source: "static",
  },
  {
    id: "static_katzenhoehle",
    url: "/media/katzenhoehle.jpg",
    label: "Katzenhöhle",
    source: "static",
  },
  {
    id: "static_futternapf",
    url: "/media/futternapf.jpg",
    label: "Futternapf",
    source: "static",
  },
  {
    id: "static_spendenprozess",
    url: "/media/spendenprozess.png",
    label: "Spendenprozess",
    source: "static",
  },
];

/**
 * Medien für den CMS-Picker: Uploads, Statik, Social-Marketing, Branding.
 */
export async function listCmsMediaLibrary(limitUploads = 48): Promise<CmsMediaLibraryItem[]> {
  const items: CmsMediaLibraryItem[] = [...STATIC_CMS_MEDIA];
  const prisma = getPrisma();

  try {
    const uploads = await prisma.contentMediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(limitUploads, 100)),
    });
    for (const row of uploads) {
      items.push({
        id: row.id,
        url: row.url,
        label: row.fileName?.trim() || row.alt.trim() || "Upload",
        source: "upload",
      });
    }
  } catch (e) {
    if (!isMissingSchemaError(e)) throw e;
  }

  try {
    const social = await prisma.homepageSocialImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: 48,
      select: { id: true, url: true, alt: true },
    });
    for (const row of social) {
      items.push({
        id: `social_${row.id}`,
        url: row.url,
        label: row.alt.trim() || "Social-Bild",
        source: "social",
      });
    }
  } catch (e) {
    if (!isMissingSchemaError(e)) throw e;
  }

  try {
    const settings = await getShopSettings();
    const branding: Array<{ id: string; url: string | null; label: string }> = [
      { id: "branding_logo_light", url: settings.logoLightUrl, label: "Logo (hell)" },
      { id: "branding_logo_dark", url: settings.logoDarkUrl, label: "Logo (dunkel)" },
      { id: "branding_og", url: settings.ogImageUrl, label: "OG-/Titelbild" },
      {
        id: "branding_admin_login_hero",
        url: settings.adminLoginHeroUrl,
        label: "Admin-Login Hintergrund",
      },
    ];
    for (const b of branding) {
      if (b.url?.trim()) {
        items.push({
          id: b.id,
          url: b.url.trim(),
          label: b.label,
          source: "branding",
        });
      }
    }
  } catch {
    // Branding optional für Picker
  }

  // Deduplicate by URL (prefer uploads).
  const seen = new Set<string>();
  const deduped: CmsMediaLibraryItem[] = [];
  for (const item of items) {
    const key = item.url.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}
