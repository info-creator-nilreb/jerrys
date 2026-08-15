import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { resolveAdminAuthState } from "@/lib/auth/resolve-admin-auth-state";

function session(overrides: Partial<Session["user"]> = {}): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "a1",
      email: "admin@example.com",
      subjectKind: "admin",
      credentialsIssuedAt: Date.parse("2026-08-15T10:00:00.000Z"),
      ...overrides,
    },
  };
}

describe("resolveAdminAuthState", () => {
  it("ist none ohne Session", () => {
    expect(resolveAdminAuthState({ session: null, admin: null }).status).toBe("none");
  });

  it("ist none für Kunden-Sessions", () => {
    const state = resolveAdminAuthState({
      session: session({ subjectKind: "customer" }),
      admin: { isActive: true, credentialsChangedAt: null, mfaEnabled: false },
    });
    expect(state.status).toBe("none");
  });

  it("ist ready für Admins ohne MFA", () => {
    const state = resolveAdminAuthState({
      session: session(),
      admin: { isActive: true, credentialsChangedAt: null, mfaEnabled: false },
    });
    expect(state.status).toBe("ready");
  });

  it("ist mfa_pending wenn Login MFA verlangt", () => {
    const state = resolveAdminAuthState({
      session: session({ mfaPending: true }),
      admin: { isActive: true, credentialsChangedAt: null, mfaEnabled: true },
    });
    expect(state.status).toBe("mfa_pending");
  });

  it("bleibt ready nach MFA-Enrollment in derselben Session", () => {
    const state = resolveAdminAuthState({
      session: session({ mfaPending: false }),
      admin: { isActive: true, credentialsChangedAt: null, mfaEnabled: true },
    });
    expect(state.status).toBe("ready");
  });

  it("verwirft JWTs älter als credentialsChangedAt", () => {
    const state = resolveAdminAuthState({
      session: session({ credentialsIssuedAt: Date.parse("2026-08-15T09:00:00.000Z") }),
      admin: {
        isActive: true,
        credentialsChangedAt: new Date("2026-08-15T10:30:00.000Z"),
        mfaEnabled: false,
      },
    });
    expect(state.status).toBe("none");
  });

  it("akzeptiert JWTs nach credentialsChangedAt", () => {
    const state = resolveAdminAuthState({
      session: session({ credentialsIssuedAt: Date.parse("2026-08-15T11:00:00.000Z") }),
      admin: {
        isActive: true,
        credentialsChangedAt: new Date("2026-08-15T10:30:00.000Z"),
        mfaEnabled: false,
      },
    });
    expect(state.status).toBe("ready");
  });
});
