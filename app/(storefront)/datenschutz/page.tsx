import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Informationen zur Verarbeitung personenbezogener Daten",
};

export default function DatenschutzPage() {
  return (
    <LegalDocumentShell title="Datenschutzerklärung" breadcrumbLabel="Datenschutz">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist der in unserem{" "}
          <a href="/impressum" className="text-primary underline underline-offset-2 hover:text-(--primary-hover)">
            Impressum
          </a>{" "}
          genannte Anbieter.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">2. Hosting und technische Infrastruktur</h2>
        <p>
          [Beschreibung des Hosters, Verarbeitungsort, ggf. Auftragsverarbeitung – bitte durch eure konkreten Angaben
          ersetzen.]
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">3. Bestellungen und Kontakt</h2>
        <p>
          Bei Bestellungen und Anfragen verarbeiten wir die von euch angegebenen Daten zur Vertragsabwicklung und
          Kommunikation. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag) bzw. Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Bearbeitung von Anfragen), soweit zutreffend.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">4. Speicherdauer</h2>
        <p>
          [Aufbewahrungsfristen und Löschkonzept – bitte konkretisieren, z. B. handels- und steuerrechtliche
          Aufbewahrungspflichten.]
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">5. Rechte der betroffenen Personen</h2>
        <p>
          Ihr habt das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          sowie Widerspruch gegen die Verarbeitung, soweit die gesetzlichen Voraussetzungen erfüllt sind. Zudem besteht
          ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
