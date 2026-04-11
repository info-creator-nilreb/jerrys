import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung",
};

export default function ImpressumPage() {
  return (
    <LegalDocumentShell title="Impressum">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Angaben gemäß § 5 TMG</h2>
        <p>
          <strong>[Firma / Name]</strong>
          <br />
          [Straße und Hausnummer]
          <br />
          [Postleitzahl Ort]
          <br />
          Deutschland
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Kontakt</h2>
        <p>
          Telefon: [Telefonnummer]
          <br />
          E-Mail: [E-Mail-Adresse]
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
          <br />
          [DE123456789]
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            className="text-primary underline underline-offset-2 hover:text-(--primary-hover)"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse findet ihr oben im Impressum.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
