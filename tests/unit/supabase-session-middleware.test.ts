import { describe, expect, it } from "vitest";
import { shouldRefreshSupabaseSessionInMiddleware } from "@/lib/http/supabase-session-middleware";

describe("shouldRefreshSupabaseSessionInMiddleware", () => {
  it("überspringt Supabase-Session-Refresh (NextAuth im Shop)", () => {
    expect(shouldRefreshSupabaseSessionInMiddleware("/")).toBe(false);
    expect(shouldRefreshSupabaseSessionInMiddleware("/produkte/foo")).toBe(false);
    expect(shouldRefreshSupabaseSessionInMiddleware("/admin/login")).toBe(false);
  });
});
