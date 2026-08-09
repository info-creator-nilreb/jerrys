import Link from "next/link";
import { Download } from "lucide-react";
import { CustomerDeleteAccountForm } from "@/components/storefront/customer-delete-account-form";
import { CustomerProfileForm } from "@/components/storefront/customer-profile-form";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CUSTOMER_DELETE_CONFIRMATION } from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getCustomerProfileForPortal } from "@/lib/auth/customer-profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Daten und Datenschutz",
  robots: { index: false, follow: false },
};

export default async function CustomerPrivacyPage() {
  const session = await getCustomerSession();
  if (!session) return null;

  const profile = await getCustomerProfileForPortal(session.customerId);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Daten und Datenschutz
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Auskunft, Berichtigung und Löschung deiner Daten. Details zur Verarbeitung stehen in der{" "}
          <Link href="/datenschutz" className={customerAuthSecondaryLinkClass}>
            Datenschutzerklärung
          </Link>
          .
        </p>
      </header>

      {!profile?.verified ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
          <p className="font-medium">E-Mail bestätigen</p>
          <p className="mt-2">
            Auskunft, Berichtigung und Löschung sind erst möglich, wenn deine E-Mail-Adresse
            bestätigt ist — sonst könnten Daten an die falsche Person gelangen.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="profil-heading" className="space-y-4">
            <div>
              <h2 id="profil-heading" className="text-base font-semibold text-(--foreground-heading)">
                Angaben berichtigen
              </h2>
              <p className="mt-1 text-sm text-(--foreground-muted)">
                Name für Anrede und Belege. Gespeicherte Liefer- und Rechnungsadressen pflegst du im{" "}
                <Link href="/konto/adressen" className={customerAuthSecondaryLinkClass}>
                  Adressbuch
                </Link>
                .
              </p>
            </div>
            <CustomerProfileForm
              firstName={profile.firstName ?? ""}
              lastName={profile.lastName ?? ""}
            />
            <p className="text-sm text-(--foreground-muted)">
              E-Mail-Adresse: <span className="font-medium text-(--foreground-heading)">{profile.email}</span>{" "}
              — eine Änderung erfordert eine erneute Bestätigung und läuft deshalb über den Support.
            </p>
          </section>

          <section aria-labelledby="auskunft-heading" className="space-y-4">
            <div>
              <h2
                id="auskunft-heading"
                className="text-base font-semibold text-(--foreground-heading)"
              >
                Daten herunterladen
              </h2>
              <p className="mt-1 text-sm text-(--foreground-muted)">
                Enthält Kontodaten, Anmeldeverfahren, gespeicherte Adressen und alle Bestellungen
                dieses Kontos als JSON-Datei. Passwörter und Anmelde-Token sind nicht enthalten — sie
                werden nur als nicht rückrechenbare Prüfwerte gespeichert.
              </p>
            </div>
            <a
              href="/konto/datenschutz/export"
              download
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-(--surface-muted) bg-white px-5 text-sm font-semibold text-(--foreground-heading) transition-colors hover:border-primary/40 hover:bg-(--surface-soft)"
            >
              <Download className="size-4" aria-hidden />
              Datenauskunft herunterladen
            </a>
          </section>

          <section aria-labelledby="loeschen-heading" className="space-y-4">
            <div>
              <h2
                id="loeschen-heading"
                className="text-base font-semibold text-(--foreground-heading)"
              >
                Konto löschen
              </h2>
              <p className="mt-1 text-sm text-(--foreground-muted)">
                Wir entfernen Login, Name und gespeicherte Adressen und lösen die Verknüpfung deiner
                Bestellungen mit dem Konto. Danach ist keine Anmeldung mehr möglich.
              </p>
            </div>
            <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-4 text-sm text-(--foreground-muted)">
              <p className="font-medium text-(--foreground-heading)">Was erhalten bleibt</p>
              <p className="mt-2">
                Bereits ausgelöste Bestellungen und Belege bleiben gespeichert, solange gesetzliche
                Aufbewahrungsfristen gelten (handels- und steuerrechtlich in der Regel zehn Jahre).
                Sie erscheinen dann nicht mehr in einem Konto, sondern nur noch in der Buchhaltung.
              </p>
            </div>
            <CustomerDeleteAccountForm confirmationWord={CUSTOMER_DELETE_CONFIRMATION} />
          </section>
        </>
      )}
    </div>
  );
}
