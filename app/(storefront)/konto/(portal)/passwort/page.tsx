import { CustomerChangePasswordForm } from "@/components/storefront/customer-change-password-form";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Passwort ändern",
  robots: { index: false, follow: false },
};

export default async function CustomerPasswordPage() {
  const session = await getCustomerSession();
  if (!session) return null;

  const customer = await getPrisma().customer.findUnique({
    where: { id: session.customerId },
    select: { passwordHash: true },
  });
  const hasExistingPassword = Boolean(customer?.passwordHash);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Passwort ändern
        </h1>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          {hasExistingPassword
            ? "Wähle ein neues Passwort mit denselben Anforderungen wie bei der Registrierung."
            : "Lege ein Passwort fest — mit denselben Anforderungen wie bei der Registrierung."}
        </p>
      </header>

      <CustomerChangePasswordForm hasExistingPassword={hasExistingPassword} />
    </div>
  );
}
