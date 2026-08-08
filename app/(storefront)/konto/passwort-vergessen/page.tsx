import Link from "next/link";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CustomerPasswordForgotForm } from "@/components/storefront/customer-password-reset-forms";

export const metadata = {
  title: "Passwort vergessen",
  robots: { index: false, follow: false },
};

export default function CustomerPasswordForgotPage() {
  return (
    <CustomerAuthShell
      title="Passwort vergessen"
      description="Wir senden dir einen Link zum Zurücksetzen, falls ein Konto zu dieser Adresse existiert."
      footer={
        <p>
          Zurück zur{" "}
          <Link href="/konto/anmelden" className={customerAuthSecondaryLinkClass}>
            Anmeldung
          </Link>
        </p>
      }
    >
      <CustomerPasswordForgotForm />
    </CustomerAuthShell>
  );
}
