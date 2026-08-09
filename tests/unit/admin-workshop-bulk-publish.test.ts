import { describe, expect, it } from "vitest";
import { bulkPublishWorkshopSessionDrafts } from "@/features/workshops/application/admin-workshop-sessions";

describe("bulkPublishWorkshopSessionDrafts", () => {
  it("lehnt leere Auswahl ab", async () => {
    const result = await bulkPublishWorkshopSessionDrafts([]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Keine Termine/);
  });
});
