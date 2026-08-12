import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import type { AiCapability, AiGenerationMeta } from "@/features/integrations/domain/ai-content-assistance";
import { estimateAiCostMicros } from "@/features/integrations/domain/ai-usage-estimate";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

export type AiContentAuditEventPublic = {
  id: string;
  createdAt: string;
  capability: string;
  status: "success" | "failure";
  errorCode: string | null;
  errorMessage: string | null;
  provider: string;
  model: string | null;
  requestId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostMicros: number | null;
  productId: string | null;
};

export type AiContentUsageSummary = {
  requestsUsedToday: number;
  dailyRequestLimit: number;
  successToday: number;
  failureToday: number;
  tokensToday: number;
  estimatedCostMicrosToday: number;
};

function utcDayStart(d = new Date()): Date {
  const key = d.toISOString().slice(0, 10);
  return new Date(`${key}T00:00:00.000Z`);
}

export async function recordAiContentGenerationEvent(input: {
  capability: AiCapability | string;
  status: "success" | "failure";
  errorCode?: string | null;
  errorMessage?: string | null;
  meta?: AiGenerationMeta | null;
  provider?: string;
  model?: string | null;
  adminUserId?: string | null;
  productId?: string | null;
  contentPageId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const inputTokens = input.meta?.usage?.inputTokens ?? null;
  const outputTokens = input.meta?.usage?.outputTokens ?? null;
  const totalTokens = input.meta?.usage?.totalTokens ?? null;
  const estimatedCostMicros =
    input.status === "success"
      ? estimateAiCostMicros({
          capability: input.capability,
          inputTokens,
          outputTokens,
          totalTokens,
        })
      : null;

  try {
    await getPrisma().aiContentGenerationEvent.create({
      data: {
        capability: String(input.capability).slice(0, 64),
        status: input.status,
        errorCode: input.errorCode?.slice(0, 120) ?? null,
        errorMessage: input.errorMessage?.slice(0, 2000) ?? null,
        provider: input.provider ?? input.meta?.provider ?? "openai",
        model: (input.model ?? input.meta?.model ?? null)?.slice(0, 120) ?? null,
        requestId: input.meta?.requestId?.slice(0, 200) ?? null,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostMicros,
        adminUserId: input.adminUserId ?? null,
        productId: input.productId ?? null,
        contentPageId: input.contentPageId ?? null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return;
    // Audit darf Generierung nicht blockieren.
    console.error("[ai-content-audit] write failed", e);
  }
}

export async function listRecentAiContentGenerationEvents(
  limit = 20,
): Promise<AiContentAuditEventPublic[]> {
  const take = Math.min(Math.max(limit, 1), 100);
  try {
    const rows = await getPrisma().aiContentGenerationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      capability: r.capability,
      status: r.status === "failure" ? "failure" : "success",
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      provider: r.provider,
      model: r.model,
      requestId: r.requestId,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      totalTokens: r.totalTokens,
      estimatedCostMicros: r.estimatedCostMicros,
      productId: r.productId,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export async function getAiContentUsageSummary(params: {
  requestsUsedToday: number;
  dailyRequestLimit: number;
}): Promise<AiContentUsageSummary> {
  const dayStart = utcDayStart();
  try {
    const rows = await getPrisma().aiContentGenerationEvent.findMany({
      where: { createdAt: { gte: dayStart } },
      select: {
        status: true,
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostMicros: true,
      },
    });

    let successToday = 0;
    let failureToday = 0;
    let tokensToday = 0;
    let estimatedCostMicrosToday = 0;

    for (const r of rows) {
      if (r.status === "failure") failureToday += 1;
      else successToday += 1;
      const tok =
        r.totalTokens ??
        (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
      tokensToday += tok;
      estimatedCostMicrosToday += r.estimatedCostMicros ?? 0;
    }

    return {
      requestsUsedToday: params.requestsUsedToday,
      dailyRequestLimit: params.dailyRequestLimit,
      successToday,
      failureToday,
      tokensToday,
      estimatedCostMicrosToday,
    };
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return {
        requestsUsedToday: params.requestsUsedToday,
        dailyRequestLimit: params.dailyRequestLimit,
        successToday: 0,
        failureToday: 0,
        tokensToday: 0,
        estimatedCostMicrosToday: 0,
      };
    }
    throw e;
  }
}
