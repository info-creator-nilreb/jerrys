import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomerAccountNav } from "@/components/storefront/customer-account-nav";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { customerHasWorkshopBookings } from "@/features/workshops";
import { REQUEST_PATHNAME_HEADER, safeInternalPath } from "@/lib/http/request-pathname";
import { isTermineFeatureEnabled } from "@/lib/shop/termine-feature";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCustomerSession();
  if (!session) {
    // Nach dem Login soll die ursprünglich angefragte Portalseite folgen, nicht pauschal `/konto`.
    const requested = safeInternalPath((await headers()).get(REQUEST_PATHNAME_HEADER), "/konto");
    redirect(`/konto/anmelden?callbackUrl=${encodeURIComponent(requested)}`);
  }

  const termineFeatureOn = await isTermineFeatureEnabled();
  const showTermineNav =
    termineFeatureOn && (await customerHasWorkshopBookings(session.customerId));

  return (
    <div className={`mx-auto w-full max-w-3xl px-4 ${storefrontMainPagePaddingClass}`}>
      <p className="text-sm font-medium text-primary">Mein Konto</p>
      <CustomerAccountNav showTermine={showTermineNav} />
      {children}
    </div>
  );
}
