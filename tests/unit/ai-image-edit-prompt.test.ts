import { describe, expect, it } from "vitest";
import { buildAiImageEditPrompt } from "@/features/integrations";

describe("buildAiImageEditPrompt", () => {
  it("baut Freistellen-Prompt mit transparentem Hintergrund", () => {
    const result = buildAiImageEditPrompt({
      mode: "cutout",
      facts: { title: "Duftkerze" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transparentBackground).toBe(true);
    expect(result.prompt.toLowerCase()).toContain("background");
    expect(result.prompt).toContain("Duftkerze");
  });

  it("fordert Prompt für Hintergrund ersetzen", () => {
    const result = buildAiImageEditPrompt({ mode: "background_replace" });
    expect(result).toMatchObject({ ok: false });
  });

  it("baut Lifestyle-Prompt", () => {
    const result = buildAiImageEditPrompt({
      mode: "lifestyle",
      prompt: "Holztisch mit Leinen",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transparentBackground).toBe(false);
    expect(result.prompt).toContain("Holztisch");
  });
});
