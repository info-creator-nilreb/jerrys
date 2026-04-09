import { hash } from "bcryptjs";
import "dotenv/config";
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
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Seeded admin user: ${email} (override with ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
