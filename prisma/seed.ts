import { hash } from "bcryptjs";
import "dotenv/config";
import { netCentsFromGross } from "../lib/catalog/pricing";
import { getPrisma } from "../lib/db/prisma";

async function main() {
  const prisma = getPrisma();
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "change-me-now";

  const passwordHash = await hash(password, 12);

  try {
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

    await prisma.manufacturer.upsert({
      where: { id: "seed_mfr_jerrys" },
      create: { id: "seed_mfr_jerrys", name: "jerry's", sortOrder: 0 },
      update: { name: "jerry's", sortOrder: 0 },
    });

    const tax = 19;
    const grossHoehle = 7900;
    const grossNapf = 2400;

    await prisma.product.upsert({
      where: { slug: "design-katzenhoehle" },
      create: {
        slug: "design-katzenhoehle",
        title: "Design Katzenhöhle",
        subtitle: "Katzenhöhle mit Stil – für Auge und Gaumen",
        description:
          "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug und Kuscheln.",
        manufacturerId: "seed_mfr_jerrys",
        taxRatePercent: tax,
        priceGrossCents: grossHoehle,
        priceNetCents: netCentsFromGross(grossHoehle, tax),
        isActive: true,
        sortOrder: 0,
        stockQuantity: 25,
        availableQuantity: 25,
        deliveryTimeKey: "2-4-werktage",
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
        taxRatePercent: tax,
        priceGrossCents: grossHoehle,
        priceNetCents: netCentsFromGross(grossHoehle, tax),
        isActive: true,
        sortOrder: 0,
        stockQuantity: 25,
        availableQuantity: 25,
        deliveryTimeKey: "2-4-werktage",
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
    });

    await prisma.product.upsert({
      where: { slug: "design-futternapf" },
      create: {
        slug: "design-futternapf",
        title: "Design Futternapf",
        subtitle: "Futternapf mit dem gewissen Etwas",
        description: "Hochwertiger Futternapf – formschön und alltagstauglich.",
        manufacturerId: "seed_mfr_jerrys",
        taxRatePercent: tax,
        priceGrossCents: grossNapf,
        priceNetCents: netCentsFromGross(grossNapf, tax),
        isActive: true,
        sortOrder: 1,
        stockQuantity: 0,
        availableQuantity: 0,
        deliveryTimeKey: "2-4-werktage",
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
        taxRatePercent: tax,
        priceGrossCents: grossNapf,
        priceNetCents: netCentsFromGross(grossNapf, tax),
        isActive: true,
        sortOrder: 1,
      },
    });

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
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Seeded admin user: ${email} (override with ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
