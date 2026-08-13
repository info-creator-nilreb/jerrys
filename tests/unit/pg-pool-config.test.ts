import { afterEach, describe, expect, it } from "vitest";
import {
  createPgPoolConfig,
  resolvePgPoolMax,
  stripSslParamsFromDatabaseUrl,
} from "@/lib/db/pg-pool-config";

const envKeys = ["PG_POOL_MAX", "VERCEL", "AWS_LAMBDA_FUNCTION_NAME"] as const;
const envSnapshot: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

afterEach(() => {
  for (const key of envKeys) {
    if (envSnapshot[key] === undefined) delete process.env[key];
    else process.env[key] = envSnapshot[key];
    delete envSnapshot[key];
  }
});

function stubEnv(key: (typeof envKeys)[number], value: string | undefined) {
  if (!(key in envSnapshot)) envSnapshot[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("stripSslParamsFromDatabaseUrl", () => {
  it("entfernt sslmode und behält Host und Pfad", () => {
    const input =
      "postgresql://user:secret@db.example.com:5432/mydb?sslmode=require&connect_timeout=10";
    const out = stripSslParamsFromDatabaseUrl(input);
    expect(out).toContain("db.example.com");
    expect(out).toContain("/mydb");
    expect(out).toContain("connect_timeout=10");
    expect(out).not.toContain("sslmode");
  });

  it("unterstützt postgres:// Schema", () => {
    const input = "postgres://u:p@example.com:5432/db?sslmode=require";
    const out = stripSslParamsFromDatabaseUrl(input);
    expect(out.startsWith("postgres://")).toBe(true);
    expect(out).not.toContain("sslmode");
  });
});

describe("resolvePgPoolMax", () => {
  it("nutzt auf Vercel standardmäßig 1", () => {
    stubEnv("PG_POOL_MAX", undefined);
    stubEnv("VERCEL", "1");
    stubEnv("AWS_LAMBDA_FUNCTION_NAME", undefined);
    expect(resolvePgPoolMax()).toBe(1);
  });

  it("respektiert PG_POOL_MAX", () => {
    stubEnv("VERCEL", "1");
    stubEnv("PG_POOL_MAX", "2");
    expect(resolvePgPoolMax()).toBe(2);
  });
});

describe("createPgPoolConfig", () => {
  it("setzt bei relaxed Pfad bereinigte URL und ssl.rejectUnauthorized", () => {
    const prevSsl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "false";

    const url =
      "postgresql://u:p@remote.supabase.co:5432/postgres?sslmode=require";
    const cfg = createPgPoolConfig(url);

    expect(cfg.ssl).toBeDefined();
    // Gleiche Semantik wie Pool-Config (relaxierte Zertifikatsprüfung bei explizitem Env).
    expect((cfg.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized).toBe(false);
    expect(cfg.connectionString).not.toContain("sslmode");
    expect(cfg.max).toBe(resolvePgPoolMax());
    expect(cfg.idleTimeoutMillis).toBe(5_000);
    expect(cfg.allowExitOnIdle).toBe(true);

    if (prevSsl === undefined) {
      delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
    } else {
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = prevSsl;
    }
  });
});
