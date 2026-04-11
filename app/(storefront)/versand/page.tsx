import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";

export const metadata: Metadata = {
  title: "Versand",
  description: "Informationen zu Lieferung und Versand",
};

export default function VersandPage() {
  return (
    <LegalDocumentShell title="Versand & Lieferung" breadcrumbLabel="Versand">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Liefergebiet</h2>
        <p>[z. B. Deutschland / EU – bitte konkretisieren.]</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Lieferzeit</h2>
        <p>
          Die voraussichtliche Lieferzeit wird im Bestellablauf bzw. auf der Produktseite mitgeteilt. Bei Vorkasse
          beginnt die Frist mit Zahlungseingang.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Versandkosten</h2>
        <p>
          Versandkosten werden im Checkout angezeigt bzw. mitgeteilt, sobald die Berechnung final implementiert ist.
          Aktuell können im Demo-Checkout Versandkosten mit 0 € ausgewiesen sein.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Transport</h2>
        <p>[Versanddienstleister, Sendungsverfolgung, Verpackung – bitte ergänzen.]</p>
      </section>
    </LegalDocumentShell>
  );
}
