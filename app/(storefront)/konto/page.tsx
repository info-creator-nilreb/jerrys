import Link from "next/link";
import { redirect } from "next/navigation";
import { customerSignOutAction } from "@/app/(storefront)/konto/actions";
import {
  CustomerAuthShell,
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata = {
  title: "Mein Konto",
  robots: { index: false, follow: false },
};

export default async function CustomerAccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/konto/anmelden?callbackUrl=/konto");

  return (
    <CustomerAuthShell
      title="Mein Konto"
      description="Du bist angemeldet. Bestellungen, Adressen und Termine folgen in den nächsten Ausbaustufen."
    >
      <div className="space-y-4 rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-4">
        <p className="text-sm text-(--foreground-heading)">
          <span className="font-medium">E-Mail:</span> {session.email ?? "—"}
        </p>
        {session.name ? (
          <p className="text-sm text-(--foreground-muted)">
            <span className="font-medium text-(--foreground-heading)">Name:</span> {session.name}
          </p>
        ) : null}
      </div>
      <form action={customerSignOutAction} className="mt-6">
        <button type="submit" className={customerAuthPrimaryButtonClass}>
          Abmelden
        </button>
      </form>
      <p className="mt-6 text-sm text-(--foreground-muted)">
        Weiter einkaufen?{" "}
        <Link href="/produkte" className={customerAuthSecondaryLinkClass}>
          Zum Katalog
        </Link>
      </p>
    </CustomerAuthShell>
  );
}
