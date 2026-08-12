import { describe, expect, it } from "vitest";
import { prepareEmailPreviewHtml } from "@/lib/email/templates/preview-html";

describe("prepareEmailPreviewHtml", () => {
  it("schreibt Branding-Asset-URLs auf die Preview-Origin um", () => {
    const html =
      '<img src="https://prod.example.com/branding/email-icons/truck.png" alt="x"/>';
    const out = prepareEmailPreviewHtml(html, "https://preview.example.com");
    expect(out).toContain('src="https://preview.example.com/branding/email-icons/truck.png"');
    expect(out).toContain('<base href="https://preview.example.com/"/>');
  });

  it("lässt Blob-URLs ohne /branding/ unverändert", () => {
    const html = '<img src="https://blob.vercel-storage.com/logo.png" alt="logo"/>';
    const out = prepareEmailPreviewHtml(html, "https://preview.example.com");
    expect(out).toContain("https://blob.vercel-storage.com/logo.png");
  });
});
