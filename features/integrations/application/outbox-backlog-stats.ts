import type { PrismaClient } from "@/app/generated/prisma/client";

/** Pending Outbox-Einträge älter als dieser Wert gelten als backlog/stale (Ops-Alert). */
export const OUTBOX_STALE_PENDING_MS = 15 * 60 * 1000;

export type IntegrationOutboxBacklogStats = {
  pendingCount: number;
  stalePendingCount: number;
  /** Alter des ältesten pending in Sekunden; null wenn kein Backlog. */
  oldestPendingAgeSeconds: number | null;
  /** Schwellwert in Sekunden (für Alert-Vergleich in Logs/Dashboards). */
  staleAfterSeconds: number;
  /**
   * Publisher ist MVP: markiert pending als `published` ohne echte Queue-Zustellung.
   * Backlog-Metrik bleibt trotzdem das Signal für „Maintenance läuft nicht“.
   */
  publisher: "mvp_audit_mark_published";
};

/**
 * Liefert Outbox-Backlog-Kennzahlen für Maintenance-Antwort und Ops-Alerts.
 * Keine Mutation — darf in `critical` und `full` laufen.
 */
export async function getIntegrationOutboxBacklogStats(
  prisma: PrismaClient,
  params?: { staleAfterMs?: number; now?: Date },
): Promise<IntegrationOutboxBacklogStats> {
  const staleAfterMs = params?.staleAfterMs ?? OUTBOX_STALE_PENDING_MS;
  const now = params?.now ?? new Date();
  const staleBefore = new Date(now.getTime() - staleAfterMs);

  const [pendingCount, stalePendingCount, oldest] = await Promise.all([
    prisma.integrationOutboxMessage.count({ where: { status: "pending" } }),
    prisma.integrationOutboxMessage.count({
      where: { status: "pending", createdAt: { lt: staleBefore } },
    }),
    prisma.integrationOutboxMessage.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const oldestPendingAgeSeconds =
    oldest != null
      ? Math.max(0, Math.floor((now.getTime() - oldest.createdAt.getTime()) / 1000))
      : null;

  return {
    pendingCount,
    stalePendingCount,
    oldestPendingAgeSeconds,
    staleAfterSeconds: Math.floor(staleAfterMs / 1000),
    publisher: "mvp_audit_mark_published",
  };
}
