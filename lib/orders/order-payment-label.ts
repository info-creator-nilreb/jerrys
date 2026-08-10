const labels: Record<string, string> = {
  pending: "Ausstehend",
  processing: "In Bearbeitung",
  succeeded: "Erfolgreich",
  partially_refunded: "Teilweise erstattet",
  failed: "Fehlgeschlagen",
  canceled: "Abgebrochen",
  refunded: "Erstattet",
};

export function orderPaymentStatusLabel(status: string): string {
  return labels[status] ?? status;
}
