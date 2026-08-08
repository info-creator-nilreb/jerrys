import { describe, expect, it } from "vitest";
import {
  isDatabaseCapacityLimited,
  shouldSkipSitemapDatabase,
} from "@/lib/db/is-database-unreachable";

describe("isDatabaseCapacityLimited", () => {
  it("erkennt Supabase EMAXCONNSESSION (inkl. cause-Kette)", () => {
    const err = new Error("DriverAdapterError");
    err.cause = {
      message:
        "(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15",
    };
    expect(isDatabaseCapacityLimited(err)).toBe(true);
    expect(shouldSkipSitemapDatabase(err)).toBe(true);
  });
});
