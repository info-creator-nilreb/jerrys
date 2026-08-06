import type { Prisma } from "@/app/generated/prisma/client";
import type { Prisma as PrismaTypes } from "@/app/generated/prisma/client";

/**
 * Persistiert ein Domain-Ereignis in der transaktionalen Outbox (Epic 1).
 */
export async function appendIntegrationOutbox(
  tx: Pick<Prisma.TransactionClient, "integrationOutboxMessage">,
  params: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: PrismaTypes.InputJsonValue;
  },
): Promise<void> {
  await tx.integrationOutboxMessage.create({
    data: {
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      payload: params.payload,
      status: "pending",
    },
  });
}
