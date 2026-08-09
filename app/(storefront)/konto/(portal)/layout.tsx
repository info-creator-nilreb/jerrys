import { redirect } from "next/navigation";
import { CustomerAccountNav } from "@/components/storefront/customer-account-nav";
import { getCustomerSession } from "@/lib/auth/customer-session";

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/konto/anmelden?callbackUrl=/konto");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <p className="text-sm font-medium text-primary">Mein Konto</p>
      <CustomerAccountNav />
      {children}
    </div>
  );
}
