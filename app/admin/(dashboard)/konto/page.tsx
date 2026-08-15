import type { Metadata } from "next";
import { KeyRound, ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getPrisma } from "@/lib/db/prisma";
import { AdminChangePasswordForm } from "@/app/admin/(dashboard)/konto/admin-change-password-form";
import { AdminMfaCard } from "@/app/admin/(dashboard)/konto/admin-mfa-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Konto",
};

export default async function AdminKontoPage() {
  const session = await getAdminSession();
  const email = session?.user?.email ?? "";
  const admin = session?.user?.id
    ? await getPrisma().adminUser.findUnique({
        where: { id: session.user.id },
        select: { mfaEnabled: true },
      })
    : null;
  const mfaEnabled = Boolean(admin?.mfaEnabled);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Konto</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Passwort und Zwei-Faktor-Authentifizierung für {email || "dieses Admin-Konto"}.
        </p>
      </div>

      {!mfaEnabled ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Zwei-Faktor-Authentifizierung ist aus. Ein zweiter Faktor schützt den Admin-Zugang,
          falls das Passwort bekannt wird.
        </p>
      ) : null}

      <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#1f2937]">
          <KeyRound className="size-4 text-primary" aria-hidden />
          Passwort
        </h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Mindestens 10 Zeichen, Groß- und Kleinbuchstabe sowie eine Ziffer. Nach dem Speichern
          enden andere Sitzungen.
        </p>
        <div className="mt-4">
          <AdminChangePasswordForm />
        </div>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#1f2937]">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          Zwei-Faktor-Authentifizierung
        </h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Optionaler TOTP-Schutz. Shop-Einstellungen bleiben unter Einstellungen.
        </p>
        <div className="mt-4">
          <AdminMfaCard mfaEnabled={mfaEnabled} />
        </div>
      </section>
    </div>
  );
}
