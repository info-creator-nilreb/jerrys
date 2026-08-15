import type { PrismaClient } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";

export type WebhookInboxBeginResult =
  | { ok: true; entryId: string; duplicate: false }
  | {
      ok: true;
      entryId: string;
      duplicate: true;
      alreadyProcessed: boolean;
      status: string;
    }
  | { ok: false; error: "race" };

/**
 * Registriert einen Provider-Vorgang idempotent (Webhook-/Capture-Dedupe).
 */
export async function beginWebhookInboxProcessing(
  db: Pick<PrismaClient, "webhookInboxEntry">,
  params: {
    provider: string;
    externalEventId: string;
    metadata?: Prisma.InputJsonValue;
    payloadHash?: string;
  },
): Promise<WebhookInboxBeginResult> {
  try {
    const created = await db.webhookInboxEntry.create({
      data: {
        provider: params.provider,
        externalEventId: params.externalEventId,
        payloadHash: params.payloadHash,
        metadata: params.metadata,
        status: "received",
      },
    });
    return { ok: true, entryId: created.id, duplicate: false };
  } catch (e) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? (e as { code: string }).code
        : undefined;
    if (code !== "P2002") {
      throw e;
    }
  }

  const existing = await db.webhookInboxEntry.findUnique({
    where: {
      provider_externalEventId: {
        provider: params.provider,
        externalEventId: params.externalEventId,
      },
    },
    select: { id: true, status: true },
  });
  if (!existing) {
    return { ok: false, error: "race" };
  }

  return {
    ok: true,
    entryId: existing.id,
    duplicate: true,
    alreadyProcessed: existing.status === "processed",
    status: existing.status,
  };
}

export async function markWebhookInboxProcessed(
  db: Pick<PrismaClient, "webhookInboxEntry">,
  entryId: string,
): Promise<void> {
  await db.webhookInboxEntry.update({
    where: { id: entryId },
    data: { status: "processed", processedAt: new Date() },
  });
}

export async function markWebhookInboxFailed(
  db: Pick<PrismaClient, "webhookInboxEntry">,
  entryId: string,
): Promise<void> {
  await db.webhookInboxEntry.update({
    where: { id: entryId },
    data: { status: "failed" },
  });
}
