import Link from "next/link";
import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import {
  WorkshopDateRequestEmptyHint,
  WorkshopDateRequestProvider,
  WorkshopDateRequestTrigger,
} from "@/components/storefront/workshop-date-request-provider";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getWorkshopDateRequestSeatGuidance } from "@/features/workshops";

export const metadata = {
  title: "Termine & Workshops",
  description: "Kommende Gruppentermine und Workshops — Verfügbarkeit in Echtzeit.",
};

export default async function StorefrontWorkshopSessionsPage() {
  const session = await getCustomerSession();
  const defaultEmail = session?.email ?? "";
  const defaultName = session?.name ?? "";
  const seatGuidance = await getWorkshopDateRequestSeatGuidance();

  return (
    <WorkshopDateRequestProvider
      defaultEmail={defaultEmail}
      defaultName={defaultName}
      seatGuidance={seatGuidance}
    >
      <div className={`mx-auto max-w-3xl px-4 ${storefrontMainPagePaddingClass}`}>
        <StorefrontBreadcrumbs items={[{ href: "/", label: "Start" }, { label: "Termine" }]} />
        <header className="mb-10 mt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading)">
            Termine & Workshops
          </h1>
          <p className="mt-3 text-sm text-(--foreground-muted)">
            Kein passender Slot? <WorkshopDateRequestTrigger />{" · "}
            Bereits gebucht?{" "}
            <Link href="/konto/termine" className="font-medium text-primary hover:underline">
              Deine Buchungen im Konto
            </Link>
          </p>
        </header>

        <WorkshopSessionList emptyStateAddon={<WorkshopDateRequestEmptyHint />} />

        <aside className="mt-10 rounded-lg border border-(--surface-muted) bg-(--surface-soft) px-4 py-6 text-center">
          <p className="text-sm text-(--foreground-muted)">Kein Termin passt zu deinem Zeitplan?</p>
          <div className="mt-3">
            <WorkshopDateRequestTrigger variant="button" />
          </div>
        </aside>
      </div>
    </WorkshopDateRequestProvider>
  );
}
