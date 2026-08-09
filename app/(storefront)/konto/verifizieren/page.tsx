import Link from "next/link";
import { Suspense } from "react";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CustomerVerifyEmailLanding } from "@/components/storefront/customer-verify-email-landing";

export const metadata = {
  title: "E-Mail bestätigen",
  robots: { index: false, follow: false },
};

export default function CustomerVerifyEmailPage() {
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
      <Suspense
        fallback={<p className="text-sm text-(--foreground-muted)">Link wird geladen…</p>}
      >
        <CustomerVerifyEmailLanding />
      </Suspense>
    </CustomerAuthShell>
  );
}
