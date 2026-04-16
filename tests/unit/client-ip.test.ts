import { describe, expect, it } from "vitest";
import { clientIpFromRequest } from "@/lib/security/client-ip";

describe("clientIpFromRequest", () => {
  it("liest x-forwarded-for (erste Adresse)", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "198.51.100.2, 10.0.0.1" },
    });
    expect(clientIpFromRequest(req)).toBe("198.51.100.2");
  });

  it("fällt auf x-real-ip zurück", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-real-ip": "192.0.2.9" },
    });
    expect(clientIpFromRequest(req)).toBe("192.0.2.9");
  });

  it("liefert unknown ohne Header", () => {
    expect(clientIpFromRequest(new Request("http://localhost/"))).toBe("unknown");
  });
});
