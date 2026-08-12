import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    aiContentGenerationEvent: {
      create,
      findMany,
    },
  }),
}));

import {
  getAiContentUsageSummary,
  listRecentAiContentGenerationEvents,
  recordAiContentGenerationEvent,
} from "@/features/integrations";

describe("ai content audit", () => {
  beforeEach(() => {
    create.mockReset();
    findMany.mockReset();
  });

  it("schreibt Success-Event mit Kostenschätzung", async () => {
    create.mockResolvedValue({});
    await recordAiContentGenerationEvent({
      capability: "text",
      status: "success",
      meta: {
        provider: "openai",
        model: "gpt-4o-mini",
        capability: "text",
        requestId: "req_1",
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      },
    });
    expect(create).toHaveBeenCalledOnce();
    const arg = create.mock.calls[0]?.[0] as {
      data: { estimatedCostMicros: number | null; status: string; totalTokens: number | null };
    };
    expect(arg.data.status).toBe("success");
    expect(arg.data.totalTokens).toBe(150);
    expect(arg.data.estimatedCostMicros).toBeGreaterThan(0);
  });

  it("listet Events für Admin", async () => {
    findMany.mockResolvedValue([
      {
        id: "e1",
        createdAt: new Date("2026-08-12T10:00:00.000Z"),
        capability: "image_generation",
        status: "failure",
        errorCode: "rate_limited",
        errorMessage: "Quota",
        provider: "openai",
        model: "dall-e-3",
        requestId: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostMicros: null,
        productId: null,
      },
    ]);
    const rows = await listRecentAiContentGenerationEvents(10);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("failure");
    expect(rows[0]?.capability).toBe("image_generation");
  });

  it("aggregiert Usage-Summary für heute", async () => {
    findMany.mockResolvedValue([
      {
        status: "success",
        totalTokens: 100,
        inputTokens: 60,
        outputTokens: 40,
        estimatedCostMicros: 1000,
      },
      {
        status: "failure",
        totalTokens: null,
        inputTokens: null,
        outputTokens: null,
        estimatedCostMicros: null,
      },
    ]);
    const summary = await getAiContentUsageSummary({
      requestsUsedToday: 5,
      dailyRequestLimit: 100,
    });
    expect(summary).toMatchObject({
      requestsUsedToday: 5,
      dailyRequestLimit: 100,
      successToday: 1,
      failureToday: 1,
      tokensToday: 100,
      estimatedCostMicrosToday: 1000,
    });
  });
});
