export function WorkshopDateRequestIntro({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-sm text-(--foreground-muted)">
        Kein passender Termin? Schick uns deinen Wunsch — ohne Buchung und ohne Zahlung. Nach Bestätigung legen
        wir einen Termin an; die Buchung folgt, sobald der Checkout freigeschaltet ist.
      </p>
    );
  }

  return (
    <p className="text-base text-(--foreground-muted)">
      Kein passender Termin im Kalender? Schick uns deinen Wunsch — ohne Buchung und ohne Zahlung. Nach
      Bestätigung durch unser Team legen wir einen Termin an und du kannst deinen Platz buchen, sobald die
      Online-Buchung freigeschaltet ist.
    </p>
  );
}

export const WORKSHOP_DATE_REQUEST_SUCCESS_MESSAGE =
  "Danke — deine Anfrage ist eingegangen. Wir prüfen sie und melden uns per E-Mail an die angegebene Adresse.";
