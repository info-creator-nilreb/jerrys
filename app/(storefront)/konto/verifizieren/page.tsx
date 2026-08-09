import Link from "next/link";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CustomerVerifyEmailForm } from "@/components/storefront/customer-verify-email-form";
import { normalizeCustomerAuthTokenFromClient } from "@/features/customers";

export const metadata = {
  title: "E-Mail bestätigen",
  robots: { index: false, follow: false },
};

function tokenFromSearchParams(sp: { token?: string | string[] }): string {
  const raw = sp.token;
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
  return normalizeCustomerAuthTokenFromClient(value);
}

export default async function CustomerVerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const token = tokenFromSearchParams(sp);

  return (
    <CustomerAuthShell
      title="E-Mail bestätigen"
      footer={
        <p>
          Weiter zur{" "}
          <Link href="/konto/anmelden" className={customerAuthSecondaryLinkClass}>
            Anmeldung
          </Link>
        </p>
      }
    >
      {token ? (
        <CustomerVerifyEmailForm token={token} />
      ) : (
        <p className="text-sm text-red-600" role="alert">
          Ungültiger Bestätigungslink. Bitte prüfe, ob der Link aus der E-Mail vollständig ist,
          oder registriere dich erneut.
        </p>
      )}
    </CustomerAuthShell>
  );
}
