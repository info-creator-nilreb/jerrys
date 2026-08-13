import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { customerHasWorkshopBookings } from "@/features/workshops";
import { isTermineFeatureEnabled } from "@/lib/shop/termine-feature";

/**
 * Konto-Termine nur bei aktivem Feature und nach mindestens einer Buchung.
 */
export default async function CustomerKontoTermineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isTermineFeatureEnabled())) {
    redirect("/konto");
  }

  const session = await getCustomerSession();
  if (!session) {
    redirect("/konto/anmelden?callbackUrl=%2Fkonto%2Ftermine");
  }

  if (!(await customerHasWorkshopBookings(session.customerId))) {
    redirect("/konto");
  }

  return children;
}
