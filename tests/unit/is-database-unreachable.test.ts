import { describe, expect, it } from "vitest";
import {
  isDatabaseCapacityError,
  isDatabaseUnreachable,
  isStorefrontDatabaseDegraded,
} from "@/lib/db/is-database-unreachable";

describe("isDatabaseCapacityError", () => {
  it("erkennt Supabase EMAXCONNSESSION", () => {
    const err = new Error("(EMAXCONNSESSION) max clients reached in session mode");
    expect(isDatabaseCapacityError(err)).toBe(true);
    expect(isStorefrontDatabaseDegraded(err)).toBe(true);
    expect(isDatabaseUnreachable(err)).toBe(false);
  });
});
