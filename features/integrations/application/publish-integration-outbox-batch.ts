import type { PrismaClient } from "@/app/generated/prisma/client";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("integrations.outbox_publish");

export type PublishIntegrationOutboxBatchResult = {
  published: number;
  failed: number;
};

/**
 * Epic-1-MVP-Publisher: markiert pending Outbox-Nachrichten als `published`
 * (Audit-/Restart-sicher), ohne echte Queue-Zustellung an Verbraucher.
 * Ops: Backlog über `getIntegrationOutboxBacklogStats` / Maintenance-Feld `outboxBacklog` beobachten.
 * Später durch einen echten Worker ersetzen — nicht als „Side-Effect erledigt“ interpretieren.
 */
export async function publishIntegrationOutboxBatch(
  prisma: PrismaClient,
  params?: { limit?: number },
): Promise<PublishIntegrationOutboxBatchResult> {
  const limit = params?.limit ?? 50;
  const pending = await prisma.integrationOutboxMessage.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let published = 0;
  let failed = 0;
  const now = new Date();

  for (const message of pending) {
    try {
      log.info("outbox_publish", {
        messageId: message.id,
        aggregateType: message.aggregateType,
        aggregateId: message.aggregateId,
        eventType: message.eventType,
      });
      await prisma.integrationOutboxMessage.update({
        where: { id: message.id },
        data: { status: "published", publishedAt: now },
      });
      published += 1;
    } catch {
      await prisma.integrationOutboxMessage.update({
        where: { id: message.id },
        data: { status: "failed" },
      });
      failed += 1;
    }
  }

  return { published, failed };
}
