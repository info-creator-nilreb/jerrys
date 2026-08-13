import { describe, expect, it } from "vitest";
import {
  infoBannerIsVisible,
  parseInfoBannerBgColorInput,
  parseInfoBannerDurationSec,
  parseInfoBannerMessages,
  resolveInfoBannerBgColor,
  resolveInfoBannerFgColor,
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

describe("resolveInfoBannerBgColor", () => {
  it("nutzt Override oder Primärfarbe", () => {
    expect(resolveInfoBannerBgColor(null, "#8bbe25")).toBe("#8bbe25");
    expect(resolveInfoBannerBgColor("primary", "#8bbe25")).toBe("#8bbe25");
    expect(resolveInfoBannerBgColor("#9a8f84", "#8bbe25")).toBe("#9a8f84");
  });
});

describe("resolveInfoBannerFgColor", () => {
  it("wählt hellen oder dunklen Text", () => {
    // Primärgrün: weiße Schrift (wie Marken-Buttons)
    expect(resolveInfoBannerFgColor("#8bbe25")).toBe("#ffffff");
    expect(resolveInfoBannerFgColor("#1f2937")).toBe("#ffffff");
    expect(resolveInfoBannerFgColor("#f5f5f4")).toBe("#1f2937");
  });
});

describe("parseInfoBannerBgColorInput", () => {
  it("mapped primary/leer auf null", () => {
    expect(parseInfoBannerBgColorInput("primary")).toEqual({ ok: true, color: null });
    expect(parseInfoBannerBgColorInput("")).toEqual({ ok: true, color: null });
    expect(parseInfoBannerBgColorInput("#AbCdEf")).toEqual({ ok: true, color: "#abcdef" });
    expect(parseInfoBannerBgColorInput("rot").ok).toBe(false);
  });
});

describe("infoBannerInputFromFormData", () => {
  it("liest aktiven Flag aus einzelnem Hidden-Feld", () => {
    const fd = new FormData();
    fd.set("infoBannerActive", "true");
    fd.set("message0", "Versandfrei ab 59 €");
    fd.set("message1", "Aktion bis Sonntag");
    fd.set("message2", "");
    fd.set("infoBannerDurationSec", "8");
    fd.set("infoBannerHref", "/versand");
    fd.set("infoBannerBgColor", "primary");

    const input = infoBannerInputFromFormData(fd);
    expect(input.active).toBe(true);
    expect(input.messages).toEqual(["Versandfrei ab 59 €", "Aktion bis Sonntag"]);
    expect(input.durationSec).toBe(8);
    expect(input.hrefRaw).toBe("/versand");
    expect(input.bgColorRaw).toBe("primary");
  });

  it("liest false und eigene Farbe", () => {
    const fd = new FormData();
    fd.set("infoBannerActive", "false");
    fd.set("message0", "Hi");
    fd.set("infoBannerDurationSec", "6");
    fd.set("infoBannerBgColor", "#9a8f84");
    const input = infoBannerInputFromFormData(fd);
    expect(input.active).toBe(false);
    expect(input.bgColorRaw).toBe("#9a8f84");
  });
});
