import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertAuthSecretForRuntime,
  resolveAuthSecret,
} from "@/lib/auth/resolve-auth-secret";

describe("resolveAuthSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bevorzugt AUTH_SECRET", () => {
    vi.stubEnv("AUTH_SECRET", "from-auth");
    vi.stubEnv("NEXTAUTH_SECRET", "from-nextauth");
    expect(resolveAuthSecret()).toBe("from-auth");
  });

  it("assertAuthSecretForRuntime wirft nicht, loggt nur bei fehlendem Secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(() => assertAuthSecretForRuntime("auth")).not.toThrow();
  });
});
