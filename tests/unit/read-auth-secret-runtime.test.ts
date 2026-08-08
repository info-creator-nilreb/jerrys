import { afterEach, describe, expect, it, vi } from "vitest";
import { readAuthSecretRuntime } from "@/lib/auth/read-auth-secret-runtime";

describe("readAuthSecretRuntime", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("liest AUTH_SECRET über dynamischen Key", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long");
    expect(readAuthSecretRuntime()).toBe(
      "test-secret-minimum-32-characters-long",
    );
  });
});
