import Link from "next/link";
import { auth } from "@/auth";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

function firstNameFromSession(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const first = n.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email.split("@")[0] ?? "Admin";
  const segment = local.split(/[._-]/)[0] ?? local;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default async function AdminHomePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? "";
  const first = firstNameFromSession(name, email);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937] lg:text-[1.65rem]">
          {timeGreeting()}, {first}.
        </h1>
        <p className="mt-2 text-[0.9375rem] text-[#6b7280]">
          Hier steuerst du Katalog und Shop – Schritt für Schritt wie bei Shopware, nur für
          jerry&apos;s.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">
            Mach dich bereit, deine Produkte zu verkaufen.
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/admin/products" className="font-medium text-primary hover:underline">
                Produkte im Katalog pflegen
              </Link>
            </li>
            <li>
              <span className="text-[#9ca3af]">Zahlungen &amp; Versand (Epic 3–4)</span>
            </li>
            <li>
              <span className="text-[#9ca3af]">Bestellungen verfolgen (Epic 4)</span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">Der erste Eindruck zählt.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
            Storefront und Admin sind aufeinander abgestimmt. Wenn dir etwas fehlt oder stört,
            sammeln wir das für die nächsten Iterationen.
          </p>
          <p className="mt-4 text-xs text-[#9ca3af]">Feedback geben — demnächst verlinkt.</p>
        </section>
      </div>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f1f3] pb-4">
          <h2 className="text-base font-semibold text-[#1f2937]">Bestellungen</h2>
          <span className="text-xs font-medium text-[#9ca3af]">Noch keine Live-Daten</span>
        </div>
        <p className="pt-5 text-sm text-[#6b7280]">
          Sobald Checkout und Bestellungen (Epic 3–4) live sind, erscheinen hier Kennzahlen und
          letzte Vorgänge – ähnlich wie im Shopware-Dashboard.
        </p>
      </section>
    </div>
  );
}
