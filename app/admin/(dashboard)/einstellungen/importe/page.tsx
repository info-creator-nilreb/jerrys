import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileUp, Package, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Importe",
};

const importCards = [
  {
    href: "/admin/einstellungen/importe/produkte",
    title: "Produkte (Shopify)",
    description:
      "Katalog aus einer Shopify-Produkt-CSV übernehmen. Zuerst Vorschau, dann bestätigter Import. Schritt 1 der Migration.",
    icon: Package,
    step: 1,
  },
  {
    href: "/admin/einstellungen/importe/bestellungen",
    title: "Bestellungen (Shopify)",
    description:
      "Historische Bestellungen als Gastbestellungen importieren. Kunden sehen sie nach Registrierung mit derselben E-Mail. Schritt 2 — nach dem Produktimport.",
    icon: ShoppingBag,
    step: 2,
  },
] as const;

export default function AdminImportePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-[#6b7280]">
          <Link href="/admin/einstellungen" className="font-medium text-primary hover:underline">
            Einstellungen
          </Link>
          <span className="mx-1.5 text-[#d1d5db]">/</span>
          Importe
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1f2937]">Importe</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Einmalige Datenmigration aus Shopify-CSV-Exporten — nicht für den laufenden Tagesbetrieb.
          Reihenfolge: zuerst Produkte, dann Bestellungen. Kundenkonten entstehen durch Registrierung;
          Bestellungen werden per E-Mail zugeordnet.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1">
        {importCards.map((card) => {
          const Icon = card.icon;
          return (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group flex gap-4 rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-[#fafdfb]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
                      Schritt {card.step}
                    </span>
                    <span className="text-base font-semibold text-[#1f2937] group-hover:text-primary">
                      {card.title}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-[#6b7280]">{card.description}</span>
                </span>
                <ArrowRight
                  className="size-5 shrink-0 self-center text-[#d1d5db] transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-4 py-3 text-sm text-[#6b7280]">
        <p className="flex items-start gap-2">
          <FileUp className="mt-0.5 size-4 shrink-0 text-[#9ca3af]" aria-hidden />
          <span>
            Exporte aus dem Admin und weitere Import-Quellen können später hier ergänzt werden. Für
            laufende Anbindungen siehe{" "}
            <Link
              href="/admin/einstellungen/integrationen"
              className="font-medium text-primary hover:underline"
            >
              Integrationen
            </Link>
            .
          </span>
        </p>
      </div>
    </div>
  );
}
