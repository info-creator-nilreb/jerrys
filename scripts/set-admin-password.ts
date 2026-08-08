import "./load-env-files";
import { hash } from "bcryptjs";
import { getPrisma } from "../lib/db/prisma";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error(
      "Bitte ADMIN_SEED_EMAIL und ADMIN_SEED_PASSWORD setzen.",
    );
    console.error(
      "In .env.local (empfohlen) oder inline, z. B.:",
    );
    console.error(
      '  ADMIN_SEED_EMAIL="admin@example.com" ADMIN_SEED_PASSWORD="…" npm run admin:set-password',
    );
    process.exit(1);
  }

  const prisma = getPrisma();
  const passwordHash = await hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, role: "admin", isActive: true },
    update: { passwordHash, isActive: true },
  });

  console.log(`Admin-Passwort gesetzt für ${email}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
