import Link from "next/link";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CustomerPasswordResetForm } from "@/components/storefront/customer-password-reset-forms";

export const metadata = {
  title: "Passwort zurücksetzen",
  robots: { index: false, follow: false },
};

export default async function CustomerPasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  return (
    <CustomerAuthShell
      title="Neues Passwort"
      description="Vergib ein neues Passwort für dein Kundenkonto."
      footer={
        <p>
          Zur{" "}
          <Link href="/konto/anmelden" className={customerAuthSecondaryLinkClass}>
            Anmeldung
          </Link>
        </p>
      }
    >
      {token ? (
        <CustomerPasswordResetForm token={token} />
      ) : (
        <p className="text-sm text-red-600" role="alert">
          Ungültiger Reset-Link. Bitte fordere einen neuen Link an.
        </p>
      )}
    </CustomerAuthShell>
  );
}
