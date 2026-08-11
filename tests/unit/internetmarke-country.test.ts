import { describe, expect, it } from "vitest";
import { toInternetmarkeCountryCode } from "@/features/fulfillment";

describe("toInternetmarkeCountryCode", () => {
  it("mappt DE → DEU und lässt ISO3 unverändert", () => {
    expect(toInternetmarkeCountryCode("DE")).toBe("DEU");
    expect(toInternetmarkeCountryCode("deu")).toBe("DEU");
    expect(toInternetmarkeCountryCode("AT")).toBe("AUT");
  });

  it("lehnt unbekannte Codes ab", () => {
    expect(toInternetmarkeCountryCode("XX")).toBeNull();
    expect(toInternetmarkeCountryCode("")).toBeNull();
  });
});
