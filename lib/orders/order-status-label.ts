/** Anzeigelabel für den in der DB gespeicherten Status-String (V1, ohne State-Machine). */
export function orderStatusLabel(status: string): string {
  switch (status) {
    case "bestaetigt":
      return "Bestätigt";
    case "draft":
      return "Entwurf";
    case "pending_payment":
      return "Zahlung ausstehend";
    case "paid":
      return "Bezahlt";
    case "processing":
      return "In Bearbeitung";
    case "shipped":
      return "Versendet";
    case "completed":
      return "Abgeschlossen";
    case "cancelled":
      return "Storniert";
    case "refunded":
      return "Erstattet";
    default:
      return status;
  }
}
