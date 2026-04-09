import { describe, expect, it } from "vitest";
import { emailSchema, parseFormData } from "@/lib/validation/form";
import { z } from "zod";

describe("parseFormData", () => {
  it("returns parsed data on success", () => {
    const schema = z.object({ name: z.string() });
    const result = parseFormData(schema, { name: "x" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("x");
  });

  it("returns zod error on failure", () => {
    const schema = z.object({ name: z.string().min(2) });
    const result = parseFormData(schema, { name: "a" });
    expect(result.success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(emailSchema.safeParse("a@b.co").success).toBe(true);
  });
});
