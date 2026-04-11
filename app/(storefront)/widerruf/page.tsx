import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  description: "Widerrufsbelehrung und Muster-Widerrufsformular",
};

export default function WiderrufPage() {
  return (
    <LegalDocumentShell title="Widerrufsrecht" breadcrumbLabel="Widerruf">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Widerrufsbelehrung</h2>
        <p>
          <strong>Widerrufsrecht</strong>
          <br />
          Ihr habt das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die
          Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem ihr oder ein von euch benannter Dritter, der nicht der
          Beförderer ist, die Waren in Besitz genommen habt bzw. hat.
        </p>
        <p>
          Um euer Widerrufsrecht auszuüben, müsst ihr uns (Anbieter siehe{" "}
          <a href="/impressum" className="text-primary underline underline-offset-2 hover:text-(--primary-hover)">
            Impressum
          </a>
          ) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über euren
          Entschluss, diesen Vertrag zu widerrufen, informieren.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass die Mitteilung über die Ausübung des Widerrufsrechts vor
          Ablauf der Widerrufsfrist abgesendet wird.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Folgen des Widerrufs</h2>
        <p>
          Wenn ihr diesen Vertrag widerruft, haben wir euch alle Zahlungen, die wir von euch erhalten haben,
          einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass ihr eine
          andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt habt), unverzüglich
          und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über euren Widerruf bei
          uns eingegangen ist. [Zahlungsmittel und Fristen bitte konkretisieren.]
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-(--foreground-heading)">Muster-Widerrufsformular</h2>
        <p className="rounded-md border border-(--surface-muted) bg-(--surface-soft) p-4 font-mono text-xs whitespace-pre-wrap text-(--foreground-heading)">
          {`An [Name, Anschrift des Unternehmens, E-Mail]:
Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)

Bestellt am (*)/erhalten am (*): _________________________
Name des/der Verbraucher(s): _________________________
Anschrift des/der Verbraucher(s): _________________________
Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): _________________________
Datum: _________________________

(*) Unzutreffendes streichen.`}
        </p>
      </section>
    </LegalDocumentShell>
  );
}
