import { SignOutButton } from "@/components/admin/sign-out-button";
import { auth } from "@/auth";

export default async function AdminHomePage() {
  const session = await auth();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Administration</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Angemeldet als {session?.user?.email ?? "—"}
      </p>
      <SignOutButton />
      <p className="mt-8 text-sm text-zinc-500">
        Produkt- und Bestellverwaltung folgen in den nächsten Epics.
      </p>
    </div>
  );
}
