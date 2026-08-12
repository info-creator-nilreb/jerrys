import { describe, expect, it } from "vitest";
import {
  AiForbiddenPromptFactsError,
  assertSafeAiProductFacts,
} from "@/features/integrations";

describe("assertSafeAiProductFacts", () => {
  it("akzeptiert Allowlist-Fakten", () => {
    expect(() =>
      assertSafeAiProductFacts({
        title: "Duftkerze",
        sku: "KERZE-1",
        categoryNames: ["Wohnen"],
        attributes: { farbe: "creme" },
        language: "de",
      }),
    ).not.toThrow();
  });

  it("lehnt unbekannte und verbotene Keys ab", () => {
    expect(() =>
      assertSafeAiProductFacts({
        title: "ok",
        customerEmail: "a@b.de",
        orderId: "ord_1",
      } as Record<string, unknown>),
    ).toThrow(AiForbiddenPromptFactsError);

    try {
      assertSafeAiProductFacts({
        email: "x@y.de",
        password: "secret",
      } as Record<string, unknown>);
      expect.unreachable("sollte werfen");
    } catch (e) {
      expect(e).toBeInstanceOf(AiForbiddenPromptFactsError);
      const err = e as AiForbiddenPromptFactsError;
      expect(err.forbiddenKeys).toEqual(expect.arrayContaining(["email", "password"]));
    }
  });
});
