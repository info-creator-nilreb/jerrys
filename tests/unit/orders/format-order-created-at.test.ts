import { describe, expect, it } from "vitest";
import { formatOrderCreatedAt } from "@/lib/orders/format-order-created-at";

describe("formatOrderCreatedAt", () => {
  it("formats a date in de-DE medium+short style", () => {
    const label = formatOrderCreatedAt(new Date("2026-08-13T08:55:58.353Z"));
    expect(label.length).toBeGreaterThan(8);
    expect(label).toMatch(/\d/);
  });
});
