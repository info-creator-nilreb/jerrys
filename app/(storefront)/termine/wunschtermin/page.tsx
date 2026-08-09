import Link from "next/link";
import { WorkshopDateRequestForm } from "@/app/(storefront)/termine/wunschtermin/workshop-date-request-form";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata = {
  title: "Wunschtermin anfragen",
  description: "Terminwunsch senden — ohne Zahlung. Wir melden uns nach Prüfung durch unser Team.",
};

export default async function StorefrontWorkshopDateRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ gesendet?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp.gesendet === "1";
  const session = await getCustomerSession();

  const defaultEmail = session?.email ?? "";
  const defaultName = session?.name ?? "";

  return (
    <div className={`mx-auto max-w-2xl px-4 ${storefrontMainPagePaddingClass}`}>
      <Link href="/termine" className="text-sm font-medium text-primary hover:underline">
        ← Alle Termine
      </Link>

      <header className="mt-4 mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading)">
          Wunschtermin anfragen
        </h1>
        <p className="text-base text-(--foreground-muted)">
          Kein passender Termin im Kalender? Schick uns deinen Wunsch — ohne Buchung und ohne Zahlung. Nach
          Bestätigung durch unser Team legen wir einen Termin an und du kannst deinen Platz buchen, sobald die
          Online-Buchung freigeschaltet ist.
        </p>
      </header>

      {sent ? (
        <p
          className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
          role="status"
        >
          Danke — deine Anfrage ist eingegangen. Wir prüfen sie und melden uns per E-Mail an die angegebene
          Adresse.
        </p>
      ) : null}

      <WorkshopDateRequestForm defaultEmail={defaultEmail} defaultName={defaultName} />
    </div>
  );
}
