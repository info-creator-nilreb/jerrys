/**
 * Zahlungsarten, die bei konfiguriertem PayPal (Orders v2) über Redirect abgewickelt werden.
 * Klarna ist hier nicht enthalten (eigenes PSP); ohne Konfiguration bleibt der Sofort-Flow (`bestaetigt`).
 */
export function usesPaypalHostedCheckout(paymentMethod: string): boolean {
  return paymentMethod === "paypal";
}
