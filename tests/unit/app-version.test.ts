import { afterEach, describe, expect, it } from "vitest";
import { formatAppVersionLabel, getAppVersion } from "@/lib/app-version";
import packageJson from "../../package.json";

describe("getAppVersion / formatAppVersionLabel", () => {
  const prev = process.env.APP_VERSION;

  afterEach(() => {
    if (prev === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = prev;
  });

  it("liest die Version aus package.json", () => {
    delete process.env.APP_VERSION;
    expect(getAppVersion()).toBe(packageJson.version);
  });

  it("bevorzugt APP_VERSION aus der Umgebung", () => {
    process.env.APP_VERSION = "v2.1.0";
    expect(getAppVersion()).toBe("2.1.0");
  });

  it("formatiert das Sidebar-Label mit führendem v", () => {
    expect(formatAppVersionLabel("1.0.0")).toBe("v1.0.0");
    expect(formatAppVersionLabel("v1.0.0")).toBe("v1.0.0");
  });
});
