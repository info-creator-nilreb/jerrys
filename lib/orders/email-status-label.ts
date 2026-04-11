export function emailTypeLabel(type: string): string {
  switch (type) {
    case "order_confirmation":
      return "Bestellbestätigung";
    case "order_shipped":
      return "Versandbenachrichtigung";
    case "order_cancelled":
      return "Storno-Benachrichtigung";
    case "order_refunded":
      return "Erstattungsbenachrichtigung";
    default:
      return type;
  }
}

export function emailSendStatusLabel(status: string): string {
  switch (status) {
    case "sent":
      return "Gesendet";
    case "failed":
      return "Fehlgeschlagen";
    case "skipped_no_provider":
      return "Nicht versendet (kein E-Mail-Anbieter)";
    default:
      return status;
  }
}
