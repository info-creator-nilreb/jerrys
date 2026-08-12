import { describe, expect, it, vi } from "vitest";
import { createOpenAiContentAdapter } from "@/features/integrations";
import type { OpenAiContentConfig } from "@/features/integrations";

const baseConfig: OpenAiContentConfig = {
  apiKey: "sk-test",
  baseUrl: "https://api.openai.com/v1",
  textModel: "gpt-4o-mini",
  visionModel: "gpt-4o-mini",
  imageModel: "dall-e-3",
  imageEditModel: "gpt-image-1",
  moderationModel: "omni-moderation-latest",
  timeoutMs: 5_000,
};

function jsonResponse(body: unknown, init?: { status?: number; requestId?: string }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init?.requestId ? { "x-request-id": init.requestId } : {}),
    },
  });
}

describe("createOpenAiContentAdapter", () => {
  it("generiert Textentwurf und liefert Metadaten", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          choices: [{ message: { content: " Kurze Kerzenbeschreibung. " } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
        { requestId: "req_1" },
      ),
    );

    const port = createOpenAiContentAdapter({ config: baseConfig, fetchImpl });
    expect(port.isConfigured()).toBe(true);
    expect(port.supports("text")).toBe(true);

    const result = await port.generateText({
      kind: "short_description",
      facts: { title: "Duftkerze", materials: ["Sojawachs"] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draftText).toBe("Kurze Kerzenbeschreibung.");
    expect(result.meta).toMatchObject({
      provider: "openai",
      model: "gpt-4o-mini",
      capability: "text",
      requestId: "req_1",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const init = call[1];
    const headers = init.headers as Record<string, string>;
    expect(String(headers.Authorization)).toContain("Bearer sk-test");
    const body = JSON.parse(String(init.body)) as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages.some((m) => String(m.content).includes("Duftkerze"))).toBe(true);
  });

  it("lehnt verbotene Prompt-Fakten vor dem Netzwerk ab", async () => {
    const fetchImpl = vi.fn();
    const port = createOpenAiContentAdapter({ config: baseConfig, fetchImpl });
    const result = await port.generateText({
      kind: "seo_title",
      facts: { title: "ok", customerEmail: "a@b.de" } as never,
    });
    expect(result).toMatchObject({ ok: false, error: "invalid_request" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("mappt Rate-Limits", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "slow down" } }, { status: 429 }));
    const port = createOpenAiContentAdapter({ config: baseConfig, fetchImpl });
    const result = await port.generateImage({ prompt: "Kerze" });
    expect(result).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("moderiert Text", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        results: [{ flagged: true, categories: { violence: true, hate: false } }],
      }),
    );
    const port = createOpenAiContentAdapter({ config: baseConfig, fetchImpl });
    const result = await port.moderate({ text: "test" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.flagged).toBe(true);
    expect(result.categories).toEqual(["violence"]);
  });

  it("liefert temporäre Bild-URL", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: [{ url: "https://example.com/tmp.png" }] }),
    );
    const port = createOpenAiContentAdapter({ config: baseConfig, fetchImpl });
    const result = await port.generateImage({ prompt: "Lifestyle-Kerze" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.temporaryImageUrl).toBe("https://example.com/tmp.png");
    expect(result.meta.capability).toBe("image_generation");
  });

  it("bearbeitet Quellbild per /images/edits", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: [{ b64_json: "aaa" }] }),
    );
    const port = createOpenAiContentAdapter({ config: baseConfig, fetchImpl });
    expect(port.supports("image_edit")).toBe(true);
    const result = await port.editImage({
      mode: "cutout",
      source: {
        bytes: Buffer.from([1, 2, 3, 4]),
        contentType: "image/png",
        filename: "source.png",
      },
      facts: { title: "Kerze" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.temporaryImageBase64).toBe("aaa");
    expect(result.meta.capability).toBe("image_edit");
    expect(String(fetchImpl.mock.calls[0]?.[0] as unknown as string)).toContain("/images/edits");
  });
});
