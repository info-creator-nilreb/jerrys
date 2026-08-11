import { afterEach, describe, expect, it } from "vitest";
import {
  createInstagramOAuthState,
  verifyInstagramOAuthState,
} from "@/lib/instagram/oauth-state";

const PREV = process.env.AUTH_SECRET;

afterEach(() => {
  if (PREV === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = PREV;
});

describe("instagram oauth state", () => {
  it("erzeugt verifizierbaren State", () => {
    process.env.AUTH_SECRET = "oauth-state-secret";
    const state = createInstagramOAuthState();
    expect(verifyInstagramOAuthState(state)).toBe(true);
    expect(verifyInstagramOAuthState(state + "x")).toBe(false);
    expect(verifyInstagramOAuthState(null)).toBe(false);
  });
});
