import { WorkshopDateRequestForm } from "@/components/storefront/workshop-date-request-form";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import {
  WORKSHOP_DATE_REQUEST_SUCCESS_MESSAGE,
  WorkshopDateRequestIntro,
} from "@/components/storefront/workshop-date-request-intro";
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
      <StorefrontBreadcrumbs
        items={[
          { href: "/", label: "Start" },
          { href: "/termine", label: "Termine" },
          { label: "Wunschtermin" },
        ]}
      />

      <header className="mt-6 mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading)">
          Wunschtermin anfragen
        </h1>
        <WorkshopDateRequestIntro />
      </header>

      {sent ? (
        <p
          className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
          role="status"
        >
          {WORKSHOP_DATE_REQUEST_SUCCESS_MESSAGE}
        </p>
      ) : null}

      <WorkshopDateRequestForm
        defaultEmail={defaultEmail}
        defaultName={defaultName}
        idPrefix="page-"
        delivery="page"
      />
    </div>
  );
}
