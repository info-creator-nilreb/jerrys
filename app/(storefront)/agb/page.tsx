import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen",
};

export default function AgbPage() {
  return (
    <LegalDocumentShell title="Allgemeine Geschäftsbedingungen (AGB)" breadcrumbLabel="AGB">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Geltungsbereich</h2>
        <p>
          Diese AGB gelten für alle Verträge zwischen dem Anbieter (siehe{" "}
          <a href="/impressum" className="text-primary underline underline-offset-2 hover:text-(--primary-hover)">
            Impressum
          </a>
          ) und den Kundinnen und Kunden über die in diesem Onlineshop angebotenen Waren.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Vertragsschluss</h2>
        <p>
          [Darstellung des Bestellvorgangs, Annahme, Zahlungsarten, Lieferung – bitte juristisch präzisieren und an eure
          Abläufe anpassen.]
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Preise und Versandkosten</h2>
        <p>
          Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer, sofern nicht anders gekennzeichnet.
          Versandkosten werden [vor Abschluss des Bestellvorgangs / gesondert] mitgeteilt.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Widerrufsrecht</h2>
        <p>
          Verbraucherinnen und Verbraucher haben ein gesetzliches Widerrufsrecht. Details findet ihr in der{" "}
          <a href="/widerruf" className="text-primary underline underline-offset-2 hover:text-(--primary-hover)">
            Widerrufsbelehrung
          </a>
          .
        </p>
      </section>
    </LegalDocumentShell>
  );
}
