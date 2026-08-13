import { hash } from "bcryptjs";
import "dotenv/config";
import { syncDefaultVariantFromProduct } from "../features/catalog/application/sync-default-variant-from-product";
import { netCentsFromGross } from "../lib/catalog/pricing";
import { getPrisma } from "../lib/db/prisma";
import {
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  SHOP_SETTINGS_DEFAULT_ID,
} from "../lib/shop/shop-settings-defaults";

async function syncDefaultVariantsForAllProducts(
  prisma: ReturnType<typeof getPrisma>,
): Promise<void> {
  const products = await prisma.product.findMany({
    select: { id: true, productNumber: true, isActive: true },
  });
  for (const p of products) {
    const v = await prisma.productVariant.findFirst({
      where: { productId: p.id, isDefault: true },
    });
    if (!v) continue;
    await prisma.$transaction(async (tx) => {
      await syncDefaultVariantFromProduct(tx, {
        id: p.id,
        productNumber: p.productNumber,
        taxRatePercent: v.taxRatePercent,
        priceGrossCents: v.priceGrossCents,
        priceNetCents: v.priceNetCents,
        listPriceGrossCents: v.listPriceGrossCents,
        listPriceNetCents: v.listPriceNetCents,
        lowestPrice30dGrossCents: v.lowestPrice30dGrossCents,
        lowestPrice30dNetCents: v.lowestPrice30dNetCents,
        stockQuantity: v.stockQuantity,
        availableQuantity: v.availableQuantity,
        deliveryTimeKey: v.deliveryTimeKey,
        restockDays: v.restockDays,
        minOrderQty: v.minOrderQty,
        purchaseStep: v.purchaseStep,
        maxOrderQty: v.maxOrderQty,
        isActive: p.isActive,
      });
    });
  }
}

async function seedDefaultVariantForProduct(
  prisma: ReturnType<typeof getPrisma>,
  productId: string,
  commerce: {
    taxRatePercent: number;
    priceGrossCents: number;
    priceNetCents: number;
    stockQuantity: number;
    availableQuantity: number;
    deliveryTimeKey: string;
    isActive: boolean;
  },
) {
  await prisma.$transaction(async (tx) => {
    await syncDefaultVariantFromProduct(tx, {
      id: productId,
      productNumber: null,
      listPriceGrossCents: null,
      listPriceNetCents: null,
      lowestPrice30dGrossCents: null,
      lowestPrice30dNetCents: null,
      restockDays: null,
      minOrderQty: 1,
      purchaseStep: 1,
      maxOrderQty: null,
      ...commerce,
    });
  });
}

async function main() {
  const prisma = getPrisma();
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
  const defaultPassword = "change-me-now";
  const password = process.env.ADMIN_SEED_PASSWORD ?? defaultPassword;
  const isProdLike =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  try {
    if (isProdLike && password === defaultPassword) {
      // Nie Seed-Default in Prod/Preview schreiben; bekannten Seed-User deaktivieren.
      const deactivated = await prisma.adminUser.updateMany({
        where: { email: "admin@example.com", isActive: true },
        data: { isActive: false },
      });
      console.warn(
        `Skipped admin seed with default password in production-like env` +
          (deactivated.count
            ? ` (deactivated ${deactivated.count} admin@example.com)`
            : ""),
      );
    } else {
      const passwordHash = await hash(password, 12);
      await prisma.adminUser.upsert({
        where: { email },
        create: {
          email,
          passwordHash,
          role: "admin",
          isActive: true,
        },
        update: {
          passwordHash,
          isActive: true,
        },
      });
    }

    await prisma.manufacturer.upsert({
      where: { id: "seed_mfr_jerrys" },
      create: { id: "seed_mfr_jerrys", name: "jerry's", sortOrder: 0 },
      update: { name: "jerry's", sortOrder: 0 },
    });

    const shopDefaults = JERRYS_SHOP_SETTINGS_DEFAULTS;
    await prisma.shopSettings.upsert({
      where: { id: SHOP_SETTINGS_DEFAULT_ID },
      create: {
        id: SHOP_SETTINGS_DEFAULT_ID,
        shopName: shopDefaults.shopName,
        shortDescription: shopDefaults.shortDescription,
        primaryColor: shopDefaults.primaryColor,
        primaryHoverColor: shopDefaults.primaryHoverColor,
        contactEmail: shopDefaults.contactEmail,
        contactPhone: shopDefaults.contactPhone,
        supportEmail: shopDefaults.supportEmail,
        legalName: shopDefaults.legalName,
        addressLine1: shopDefaults.addressLine1,
        addressLine2: shopDefaults.addressLine2,
        addressZip: shopDefaults.addressZip,
        addressCity: shopDefaults.addressCity,
        addressCountry: shopDefaults.addressCountry,
        vatId: shopDefaults.vatId,
        instagramUrl: shopDefaults.instagramUrl,
        facebookUrl: shopDefaults.facebookUrl,
        emailFromName: shopDefaults.emailFromName,
        logoLightUrl: shopDefaults.logoLightUrl,
        logoDarkUrl: shopDefaults.logoDarkUrl,
        faviconUrl: shopDefaults.faviconUrl,
        ogImageUrl: shopDefaults.ogImageUrl,
        showAllProductsInNav: shopDefaults.showAllProductsInNav,
        showTermineInNav: shopDefaults.showTermineInNav,
        desktopShopNavMode: shopDefaults.desktopShopNavMode,
        footerShowTagline: shopDefaults.footerShowTagline,
        footerShowShopNav: shopDefaults.footerShowShopNav,
        footerShowCollections: shopDefaults.footerShowCollections,
        footerShowCmsLinks: shopDefaults.footerShowCmsLinks,
        footerShowSocial: shopDefaults.footerShowSocial,
        footerShowLegalAgb: shopDefaults.footerShowLegalAgb,
        footerShowLegalWiderruf: shopDefaults.footerShowLegalWiderruf,
        footerShowLegalRueckgabe: shopDefaults.footerShowLegalRueckgabe,
        footerShowLegalVersand: shopDefaults.footerShowLegalVersand,
      },
      update: {
        // Bestehende Installationen nicht überschreiben — nur fehlende Zeile anlegen.
      },
    });

    const tax = 19;
    const grossHoehle = 7900;
    const grossNapf = 2400;

    const hoehle = await prisma.product.upsert({
      where: { slug: "design-katzenhoehle" },
      create: {
        slug: "design-katzenhoehle",
        title: "Design Katzenhöhle",
        subtitle: "Katzenhöhle mit Stil – für Auge und Gaumen",
        description:
          "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug und Kuscheln.",
        manufacturerId: "seed_mfr_jerrys",
        isActive: true,
        sortOrder: 0,
        categoryTag: "Für Auge & Gaumen",
        leadText:
          "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug, Entspannung und süße Träume.",
        dimensionsText: "ca. 50 × 40 × 35 cm (B × T × H)",
        weightText: "ca. 2,1 kg",
        materialText: "Hochwertiger Kunststoff, kratzfest & pflegeleicht",
        featureBullets: [
          "Stabil & langlebig",
          "Pflegeleicht abwischbar",
          "Angenehm geschlossene Form",
          "Rutschfest durch Gummifüße",
        ],
        amazonRatingAverage: 4.8,
        amazonRatingCount: 29,
        amazonReviewUrl:
          "https://www.amazon.de/Jerrys-Design-Katzenh%C3%B6hle-inklusive-Kuschelkissen/dp/B00SYGOLIO",
        images: {
          create: [
            {
              url: "/media/katzenhoehle.jpg",
              alt: "Design Katzenhöhle von jerry's in Edelweiß",
              sortOrder: 0,
              isCover: true,
            },
          ],
        },
      },
      update: {
        title: "Design Katzenhöhle",
        subtitle: "Katzenhöhle mit Stil – für Auge und Gaumen",
        description:
          "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug und Kuscheln.",
        manufacturerId: "seed_mfr_jerrys",
        isActive: true,
        sortOrder: 0,
        categoryTag: "Für Auge & Gaumen",
        leadText:
          "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug, Entspannung und süße Träume.",
        dimensionsText: "ca. 50 × 40 × 35 cm (B × T × H)",
        weightText: "ca. 2,1 kg",
        materialText: "Hochwertiger Kunststoff, kratzfest & pflegeleicht",
        featureBullets: [
          "Stabil & langlebig",
          "Pflegeleicht abwischbar",
          "Angenehm geschlossene Form",
          "Rutschfest durch Gummifüße",
        ],
        amazonRatingAverage: 4.8,
        amazonRatingCount: 29,
        amazonReviewUrl:
          "https://www.amazon.de/Jerrys-Design-Katzenh%C3%B6hle-inklusive-Kuschelkissen/dp/B00SYGOLIO",
      },
      select: { id: true },
    });

    await seedDefaultVariantForProduct(prisma, hoehle.id, {
      taxRatePercent: tax,
      priceGrossCents: grossHoehle,
      priceNetCents: netCentsFromGross(grossHoehle, tax),
      stockQuantity: 25,
      availableQuantity: 25,
      deliveryTimeKey: "2-4-werktage",
      isActive: true,
    });

    const napf = await prisma.product.upsert({
      where: { slug: "design-futternapf" },
      create: {
        slug: "design-futternapf",
        title: "Design Futternapf",
        subtitle: "Futternapf mit dem gewissen Etwas",
        description: "Hochwertiger Futternapf – formschön und alltagstauglich.",
        manufacturerId: "seed_mfr_jerrys",
        isActive: true,
        sortOrder: 1,
        images: {
          create: [
            {
              url: "/media/futternapf.jpg",
              alt: "Design Futternapf von jerry's",
              sortOrder: 0,
              isCover: true,
            },
          ],
        },
      },
      update: {
        title: "Design Futternapf",
        subtitle: "Futternapf mit dem gewissen Etwas",
        description: "Hochwertiger Futternapf – formschön und alltagstauglich.",
        manufacturerId: "seed_mfr_jerrys",
        isActive: true,
        sortOrder: 1,
      },
      select: { id: true },
    });

    await seedDefaultVariantForProduct(prisma, napf.id, {
      taxRatePercent: tax,
      priceGrossCents: grossNapf,
      priceNetCents: netCentsFromGross(grossNapf, tax),
      stockQuantity: 0,
      availableQuantity: 0,
      deliveryTimeKey: "2-4-werktage",
      isActive: true,
    });

    const catKatzen = await prisma.category.upsert({
      where: { slug: "katzen" },
      create: {
        id: "seed_cat_katzen",
        slug: "katzen",
        title: "Katzen",
        description: "Produkte für Stubentiger — Demo-Kategorie (Epic 10 Seed).",
        sortOrder: 0,
        isActive: true,
      },
      update: {
        title: "Katzen",
        description: "Produkte für Stubentiger — Demo-Kategorie (Epic 10 Seed).",
        sortOrder: 0,
        isActive: true,
      },
    });

    const colKatzen = await prisma.collection.upsert({
      where: { slug: "katzen" },
      create: {
        id: "seed_col_katzen",
        slug: "katzen",
        title: "Katzen",
        description: "Demo-Kollektion für Kategorie Katzen (ADR 0010).",
        sortOrder: 0,
        isActive: true,
      },
      update: {
        title: "Katzen",
        description: "Demo-Kollektion für Kategorie Katzen (ADR 0010).",
        sortOrder: 0,
        isActive: true,
      },
    });

    await prisma.categoryCollection.upsert({
      where: {
        categoryId_collectionId: {
          categoryId: catKatzen.id,
          collectionId: colKatzen.id,
        },
      },
      create: {
        categoryId: catKatzen.id,
        collectionId: colKatzen.id,
        sortOrder: 0,
      },
      update: { sortOrder: 0 },
    });

    await prisma.collectionProduct.upsert({
      where: {
        collectionId_productId: { collectionId: colKatzen.id, productId: hoehle.id },
      },
      create: { collectionId: colKatzen.id, productId: hoehle.id, sortOrder: 0 },
      update: { sortOrder: 0 },
    });

    await prisma.collectionProduct.upsert({
      where: {
        collectionId_productId: { collectionId: colKatzen.id, productId: napf.id },
      },
      create: { collectionId: colKatzen.id, productId: napf.id, sortOrder: 1 },
      update: { sortOrder: 1 },
    });

    await syncDefaultVariantsForAllProducts(prisma);

    await prisma.homepageAmazonReview.upsert({
      where: { id: "seed_homepage_review_1" },
      create: {
        id: "seed_homepage_review_1",
        quote:
          "Sehr schöne Katzenhöhle, stabil und gut verarbeitet. Unsere beiden Stubentiger teilen sich den Platz gern.",
        rating: 5,
        headline: "Top für den Alltag",
        author: "Beispiel aus Amazon",
        sourceUrl:
          "https://www.amazon.de/Jerrys-Design-Katzenh%C3%B6hle-inklusive-Kuschelkissen/dp/B00SYGOLIO",
        sortOrder: 0,
        isActive: true,
      },
      update: {
        quote:
          "Sehr schöne Katzenhöhle, stabil und gut verarbeitet. Unsere beiden Stubentiger teilen sich den Platz gern.",
        rating: 5,
        headline: "Top für den Alltag",
        author: "Beispiel aus Amazon",
        sourceUrl:
          "https://www.amazon.de/Jerrys-Design-Katzenh%C3%B6hle-inklusive-Kuschelkissen/dp/B00SYGOLIO",
        sortOrder: 0,
        isActive: true,
      },
    });

    await prisma.homepageAmazonReview.upsert({
      where: { id: "seed_homepage_review_2" },
      create: {
        id: "seed_homepage_review_2",
        quote: "Würde ich wieder kaufen – passt optisch super ins Wohnzimmer.",
        rating: 5,
        author: "Beispiel aus Amazon",
        sortOrder: 10,
        isActive: true,
      },
      update: {
        quote: "Würde ich wieder kaufen – passt optisch super ins Wohnzimmer.",
        rating: 5,
        author: "Beispiel aus Amazon",
        sortOrder: 10,
        isActive: true,
      },
    });

    const now = new Date();
    const y = now.getUTCFullYear();
    const startPast = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
    const endFar = new Date(Date.UTC(y + 1, 11, 31, 23, 59, 59));
    const startFuture = new Date(Date.UTC(y + 1, 2, 1, 0, 0, 0));
    const endFuture = new Date(Date.UTC(y + 1, 11, 31, 23, 59, 59));
    const endPast = new Date(Date.UTC(y - 1, 11, 31, 23, 59, 59));

    await prisma.promotion.upsert({
      where: { id: "seed_promo_welcome_auto" },
      create: {
        id: "seed_promo_welcome_auto",
        title: "Willkommens-Rabatt (automatisch)",
        promotionType: "order_discount",
        applicationMode: "automatic",
        code: null,
        discountValueType: "percent",
        discountValue: 5,
        minimumRequirementType: "cart_value",
        minimumCartValueCents: 5000,
        startDate: startPast,
        endDate: endFar,
        isEnabled: true,
        publishedOnce: true,
        usageCount: 3,
      },
      update: {
        title: "Willkommens-Rabatt (automatisch)",
        minimumCartValueCents: 5000,
        discountValue: 5,
        isEnabled: true,
        publishedOnce: true,
        startDate: startPast,
        endDate: endFar,
      },
    });

    await prisma.promotion.upsert({
      where: { id: "seed_promo_code_spring" },
      create: {
        id: "seed_promo_code_spring",
        title: "Frühling – Code",
        promotionType: "order_discount",
        applicationMode: "code",
        code: "FRHL24",
        discountValueType: "fixed",
        discountValue: 500,
        minimumRequirementType: "none",
        minimumCartValueCents: null,
        startDate: startPast,
        endDate: endFar,
        isEnabled: true,
        publishedOnce: true,
        usageCount: 12,
      },
      update: {
        code: "FRHL24",
        discountValue: 500,
        isEnabled: true,
        publishedOnce: true,
        startDate: startPast,
        endDate: endFar,
      },
    });

    await prisma.promotion.upsert({
      where: { id: "seed_promo_draft" },
      create: {
        id: "seed_promo_draft",
        title: "Neue Aktion (Entwurf)",
        promotionType: "order_discount",
        applicationMode: "code",
        code: "DRAFT1",
        discountValueType: "percent",
        discountValue: 10,
        minimumRequirementType: "none",
        minimumCartValueCents: null,
        startDate: startPast,
        endDate: endFar,
        isEnabled: false,
        publishedOnce: false,
        usageCount: 0,
      },
      update: {
        isEnabled: false,
        publishedOnce: false,
      },
    });

    await prisma.promotion.upsert({
      where: { id: "seed_promo_planned" },
      create: {
        id: "seed_promo_planned",
        title: "Geplant (Start in der Zukunft)",
        promotionType: "order_discount",
        applicationMode: "automatic",
        code: null,
        discountValueType: "percent",
        discountValue: 8,
        minimumRequirementType: "none",
        minimumCartValueCents: null,
        startDate: startFuture,
        endDate: endFuture,
        isEnabled: true,
        publishedOnce: true,
        usageCount: 0,
      },
      update: {
        startDate: startFuture,
        endDate: endFuture,
        isEnabled: true,
        publishedOnce: true,
      },
    });

    await prisma.promotion.upsert({
      where: { id: "seed_promo_expired" },
      create: {
        id: "seed_promo_expired",
        title: "Alte Kampagne (abgelaufen)",
        promotionType: "order_discount",
        applicationMode: "code",
        code: "OLD99",
        discountValueType: "percent",
        discountValue: 15,
        minimumRequirementType: "none",
        minimumCartValueCents: null,
        startDate: startPast,
        endDate: endPast,
        isEnabled: true,
        publishedOnce: true,
        usageCount: 42,
      },
      update: {
        endDate: endPast,
        isEnabled: true,
        publishedOnce: true,
      },
    });

    await prisma.homepageSocialImage.upsert({
      where: { id: "seed_homepage_social_1" },
      create: {
        id: "seed_homepage_social_1",
        url: "/media/katzenhoehle.jpg",
        alt: "Design Katzenhöhle von jerry's (Beispiel für Startseiten-Slider)",
        href: null,
        sortOrder: 0,
        isActive: true,
      },
      update: {
        url: "/media/katzenhoehle.jpg",
        alt: "Design Katzenhöhle von jerry's (Beispiel für Startseiten-Slider)",
        sortOrder: 0,
        isActive: true,
      },
    });

    const { WORKSHOP_CHECKOUT_PRODUCT_SLUG, WORKSHOP_CHECKOUT_PRODUCT_SKU } = await import(
      "../lib/workshop/workshop-checkout-catalog"
    );
    const workshopCheckoutProduct = await prisma.product.upsert({
      where: { slug: WORKSHOP_CHECKOUT_PRODUCT_SLUG },
      create: {
        slug: WORKSHOP_CHECKOUT_PRODUCT_SLUG,
        title: "Workshop-Platz (intern)",
        isActive: false,
        sortOrder: 9999,
      },
      update: { isActive: false },
    });
    await prisma.productVariant.upsert({
      where: { sku: WORKSHOP_CHECKOUT_PRODUCT_SKU },
      create: {
        productId: workshopCheckoutProduct.id,
        sku: WORKSHOP_CHECKOUT_PRODUCT_SKU,
        title: "Workshop-Platz",
        priceGrossCents: 0,
        priceNetCents: 0,
        taxRatePercent: 19,
        stockQuantity: 999_999,
        availableQuantity: 999_999,
        isDefault: true,
        isActive: true,
      },
      update: {
        productId: workshopCheckoutProduct.id,
        availableQuantity: 999_999,
        stockQuantity: 999_999,
        isActive: true,
      },
    });
    const { migrateStorefrontContentPages } = await import(
      "../lib/content/migrate-storefront-content"
    );
    const migrated = await migrateStorefrontContentPages();
    console.log(
      `CMS Storefront-Migration: homepage=${migrated.homepageId}, legal=${migrated.legalCount}`,
    );
  } finally {
    await prisma.$disconnect();
  }

  if (!(isProdLike && password === defaultPassword)) {
    console.log(
      `Seeded admin user: ${email} (override with ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
