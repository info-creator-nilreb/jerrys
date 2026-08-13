/**
 * Commerce-Maintenance-Modi (P1):
 * - `critical`: Stock-Expiry, Workshop-Holds, PayPal-Reconciliation (+ Outbox-Backlog-Metrik)
 * - `full`: zusätzlich Outbox-Publisher (MVP), Instagram, Zettle
 *
 * Default `full` für Rückwärtskompatibilität (Vercel-Tages-Cron ohne Query).
 */
export type CommerceMaintenanceMode = "critical" | "full";

export function parseCommerceMaintenanceMode(
  input: string | null | undefined,
): CommerceMaintenanceMode {
  const normalized = input?.trim().toLowerCase();
  if (normalized === "critical") return "critical";
  return "full";
}
