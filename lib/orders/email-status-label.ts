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
    case "workshop_booking_confirmation":
      return "Terminbestätigung";
    case "workshop_booking_cancelled":
      return "Termin storniert";
    case "workshop_date_request_approved":
      return "Wunschtermin angenommen";
    case "workshop_date_request_rejected":
      return "Wunschtermin abgelehnt";
    case "email_verify":
      return "E-Mail bestätigen";
    case "magic_link":
      return "Magic Link";
    case "password_reset":
      return "Passwort zurücksetzen";
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
