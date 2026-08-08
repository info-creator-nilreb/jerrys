import { afterEach, describe, expect, it } from "vitest";
import {
  assertAuthSecretForRuntime,
  resolveAuthSecret,
} from "@/lib/auth/resolve-auth-secret";

describe("resolveAuthSecret", () => {
  const keys = ["AUTH_SECRET", "NEXTAUTH_SECRET", "NODE_ENV"] as const;

  function snap() {
    return Object.fromEntries(keys.map((k) => [k, process.env[k]])) as Record<
      (typeof keys)[number],
      string | undefined
    >;
  }

  function restore(s: ReturnType<typeof snap>) {
    for (const k of keys) {
      const v = s[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  it("bevorzugt AUTH_SECRET", () => {
    const before = snap();
    try {
      process.env.AUTH_SECRET = "from-auth";
      process.env.NEXTAUTH_SECRET = "from-nextauth";
      expect(resolveAuthSecret()).toBe("from-auth");
    } finally {
      restore(before);
    }
  });

  it("assertAuthSecretForRuntime wirft nicht, loggt nur bei fehlendem Secret", () => {
    const before = snap();
    try {
      process.env.NODE_ENV = "production";
      delete process.env.AUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;
      expect(() => assertAuthSecretForRuntime("auth")).not.toThrow();
    } finally {
      restore(before);
    }
  });
});
