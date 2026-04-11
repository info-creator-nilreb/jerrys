import { describe, expect, it } from "vitest";
import { errorMeta } from "@/lib/logging/logger";

describe("errorMeta", () => {
  it("serialisiert Error", () => {
    const m = errorMeta(new Error("x"));
    expect(m.errName).toBe("Error");
    expect(m.errMessage).toBe("x");
  });

  it("serialisiert Nicht-Errors", () => {
    expect(errorMeta(404)).toEqual({ errMessage: "404" });
  });
});
