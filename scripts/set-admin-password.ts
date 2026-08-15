import "./load-env-files";
import { hash } from "bcryptjs";
import { getPrisma } from "../lib/db/prisma";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim();
  const password = process.env.ADMIN_SEED_PASSWORD;
  const disableMfa = process.argv.includes("--disable-mfa");

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
    console.error(
      "MFA serverseitig deaktivieren (Lockout): denselben Befehl mit --disable-mfa",
    );
    process.exit(1);
  }

  const prisma = getPrisma();
  const passwordHash = await hash(password, 12);
  const now = new Date();

  const admin = await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: "admin",
      isActive: true,
      credentialsChangedAt: now,
    },
    update: {
      passwordHash,
      isActive: true,
      credentialsChangedAt: now,
      ...(disableMfa
        ? { mfaEnabled: false, mfaSecretEnc: null, mfaEnabledAt: null }
        : {}),
    },
  });

  if (disableMfa) {
    await prisma.adminMfaRecoveryCode.deleteMany({ where: { adminUserId: admin.id } });
  }

  console.log(`Admin-Passwort gesetzt für ${email}`);
  if (disableMfa) {
    console.log("MFA für dieses Konto deaktiviert.");
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
