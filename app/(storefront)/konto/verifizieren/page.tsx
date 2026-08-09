import Link from "next/link";
import { verifyEmailAction } from "@/app/(storefront)/konto/actions";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";

export const metadata = {
  title: "E-Mail bestätigen",
  robots: { index: false, follow: false },
};

export default async function CustomerVerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const result = token
    ? await verifyEmailAction(token)
    : { ok: false, message: "Ungültiger Bestätigungslink." };

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
      <p
        className={result?.ok ? "text-sm font-medium text-primary" : "text-sm text-red-600"}
        role={result?.ok ? "status" : "alert"}
      >
        {result?.message}
      </p>
    </CustomerAuthShell>
  );
}
