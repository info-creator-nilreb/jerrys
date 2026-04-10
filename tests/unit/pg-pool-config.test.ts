import { describe, expect, it } from "vitest";
import {
  createPgPoolConfig,
  stripSslParamsFromDatabaseUrl,
} from "@/lib/db/pg-pool-config";

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

describe("createPgPoolConfig", () => {
  it("setzt bei relaxed Pfad bereinigte URL und ssl.rejectUnauthorized", () => {
    const prevSsl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "false";

    const url =
      "postgresql://u:p@remote.supabase.co:5432/postgres?sslmode=require";
    const cfg = createPgPoolConfig(url);

    expect(cfg.ssl).toEqual({ rejectUnauthorized: false });
    expect(cfg.connectionString).not.toContain("sslmode");

    if (prevSsl === undefined) {
      delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
    } else {
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = prevSsl;
    }
  });
});
