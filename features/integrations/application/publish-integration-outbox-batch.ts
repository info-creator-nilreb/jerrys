import type { PrismaClient } from "@/app/generated/prisma/client";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("integrations.outbox_publish");

export type PublishIntegrationOutboxBatchResult = {
  published: number;
  failed: number;
};

/**
 * Markiert ausstehende Outbox-Nachrichten als veröffentlicht (Epic 1 MVP-Publisher).
 * Später durch Queue-Worker ersetzbar; heute idempotent und restart-sicher.
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
