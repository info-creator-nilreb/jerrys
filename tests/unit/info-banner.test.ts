import { describe, expect, it } from "vitest";
import {
  infoBannerIsVisible,
  parseInfoBannerDurationSec,
  parseInfoBannerMessages,
} from "@/lib/shop/info-banner";
import { infoBannerInputFromFormData } from "@/lib/shop/update-info-banner";

describe("parseInfoBannerMessages", () => {
  it("trimmt, begrenzt und filtert leer", () => {
    expect(
      parseInfoBannerMessages(["  A  ", "", "B", "C", "D"]),
    ).toEqual(["A", "B", "C"]);
  });

  it("schneidet lange Texte", () => {
    const long = "x".repeat(200);
    expect(parseInfoBannerMessages([long])[0]).toHaveLength(120);
  });
});

describe("parseInfoBannerDurationSec", () => {
  it("akzeptiert bekannte Werte und fällt sonst auf 6 zurück", () => {
    expect(parseInfoBannerDurationSec(8)).toBe(8);
    expect(parseInfoBannerDurationSec("4")).toBe(4);
    expect(parseInfoBannerDurationSec(99)).toBe(6);
  });
});

describe("infoBannerIsVisible", () => {
  it("braucht aktiv und mindestens einen Text", () => {
    expect(infoBannerIsVisible({ active: true, messages: ["Hi"] })).toBe(true);
    expect(infoBannerIsVisible({ active: false, messages: ["Hi"] })).toBe(false);
    expect(infoBannerIsVisible({ active: true, messages: [] })).toBe(false);
  });
});

describe("infoBannerInputFromFormData", () => {
  it("liest Checkbox, Texte und Dauer", () => {
    const fd = new FormData();
    fd.set("infoBannerActive", "false");
    fd.append("infoBannerActive", "true");
    fd.set("message0", "Versandfrei ab 59 €");
    fd.set("message1", "Aktion bis Sonntag");
    fd.set("message2", "");
    fd.set("infoBannerDurationSec", "8");
    fd.set("infoBannerHref", "/versand");

    const input = infoBannerInputFromFormData(fd);
    expect(input.active).toBe(true);
    expect(input.messages).toEqual(["Versandfrei ab 59 €", "Aktion bis Sonntag"]);
    expect(input.durationSec).toBe(8);
    expect(input.hrefRaw).toBe("/versand");
  });
});
