import { describe, expect, it } from "vitest";
import { buildPreviewWorkshopIcsAttachment } from "@/lib/email/templates/preview-workshop-ics";

describe("buildPreviewWorkshopIcsAttachment", () => {
  it("liefert gültige Kalenderdatei für Testversand", () => {
    const attachment = buildPreviewWorkshopIcsAttachment();
    expect(attachment.filename).toBe("jerrys-workshop.ics");
    expect(attachment.contentType).toContain("text/calendar");
    const text = attachment.content.toString("utf-8");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("SUMMARY:Gin Tasting");
  });
});
