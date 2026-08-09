import Link from "next/link";
import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";

export const metadata = {
  title: "Termine & Workshops",
  description: "Kommende Gruppentermine und Workshops — Verfügbarkeit in Echtzeit.",
};

export default function StorefrontWorkshopSessionsPage() {
  return (
    <div className={`mx-auto max-w-3xl px-4 ${storefrontMainPagePaddingClass}`}>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading)">
          Termine & Workshops
        </h1>
        <p className="mt-3 text-base text-(--foreground-muted)">
          Live-Termine mit begrenzter Kapazität. Die Anzeige „ausgebucht“ oder „Mindestteilnehmer noch offen“
          kommt direkt vom Server — nicht aus dem Browser geraten.
        </p>
        <p className="mt-2 text-sm text-(--foreground-muted)">
          Kein passender Slot?{" "}
          <Link href="/termine/wunschtermin" className="font-medium text-primary hover:underline">
            Wunschtermin anfragen
          </Link>
          {" · "}
          Bereits gebucht?{" "}
          <Link href="/konto/termine" className="font-medium text-primary hover:underline">
            Deine Buchungen im Konto
          </Link>
        </p>
      </header>

      <WorkshopSessionList />
    </div>
  );
}
