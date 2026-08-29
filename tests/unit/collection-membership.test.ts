import { describe, expect, it } from "vitest";
import {
  COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS,
  COLLECTION_MEMBERSHIP_MANUAL,
  cutoffDateForCreatedWithinDays,
  isAutomaticCollectionMembership,
  normalizeCreatedWithinRuleDays,
  parseCollectionMembershipMode,
} from "@/lib/catalog/collection-membership";

describe("collection-membership", () => {
  it("parseCollectionMembershipMode defaults to manual", () => {
    expect(parseCollectionMembershipMode(undefined)).toBe(COLLECTION_MEMBERSHIP_MANUAL);
    expect(parseCollectionMembershipMode("manual")).toBe(COLLECTION_MEMBERSHIP_MANUAL);
    expect(parseCollectionMembershipMode("created_within_days")).toBe(
      COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS,
    );
  });

  it("isAutomaticCollectionMembership erkennt automatische Regeln", () => {
    expect(isAutomaticCollectionMembership(COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS)).toBe(true);
    expect(isAutomaticCollectionMembership(COLLECTION_MEMBERSHIP_MANUAL)).toBe(false);
  });

  it("normalizeCreatedWithinRuleDays begrenzt auf 1–365", () => {
    expect(normalizeCreatedWithinRuleDays(0)).toBe(1);
    expect(normalizeCreatedWithinRuleDays(30)).toBe(30);
    expect(normalizeCreatedWithinRuleDays(999)).toBe(365);
    expect(normalizeCreatedWithinRuleDays(null)).toBe(30);
  });

  it("cutoffDateForCreatedWithinDays nutzt UTC-Mitternacht", () => {
    const now = new Date("2026-08-29T15:30:00.000Z");
    const cutoff = cutoffDateForCreatedWithinDays(30, now);
    expect(cutoff.toISOString()).toBe("2026-07-30T00:00:00.000Z");
  });
});

describe("collectionUpsertSchema", () => {
  it("verlangt ruleDays bei automatischer Neu-Regel", async () => {
    const { collectionUpsertSchema } = await import("@/lib/catalog/collection-schemas");
    const invalid = collectionUpsertSchema.safeParse({
      title: "Neu",
      slug: "neu",
      membershipMode: "created_within_days",
    });
    expect(invalid.success).toBe(false);

    const valid = collectionUpsertSchema.safeParse({
      title: "Neu",
      slug: "neu",
      membershipMode: "created_within_days",
      ruleDays: 14,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.ruleDays).toBe(14);
    }
  });
});
