const labels: Record<string, string> = {
  pending: "Ausstehend",
  processing: "In Bearbeitung",
  succeeded: "Erfolgreich",
  failed: "Fehlgeschlagen",
  canceled: "Abgebrochen",
  refunded: "Erstattet",
};

export function orderPaymentStatusLabel(status: string): string {
  return labels[status] ?? status;
}
