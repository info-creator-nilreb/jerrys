import { describe, expect, it } from "vitest";
import {
  extractTemplateVariablePaths,
  renderEmailBodies,
  renderTemplateString,
} from "@/lib/email/templates/render";
import { getEmailTemplateDefault, getAllEmailTemplateDefaults } from "@/lib/email/templates/defaults";
import { EMAIL_TEMPLATE_KEYS, sampleVarsForTemplate } from "@/lib/email/templates/catalog";

describe("email template render", () => {
  it("escapes double mustaches and keeps triple raw", () => {
    const out = renderTemplateString(
      `Hello {{name}} — {{{html}}}`,
      { name: "<b>Alex</b>", html: "<strong>OK</strong>" },
    );
    expect(out).toBe("Hello &lt;b&gt;Alex&lt;/b&gt; — <strong>OK</strong>");
  });

  it("resolves nested paths", () => {
    const out = renderTemplateString("{{order.number}} / {{shop.name}}", {
      order: { number: "ORD-1" },
      shop: { name: "jerry's" },
    });
    expect(out).toBe("ORD-1 / jerry&#39;s");
  });

  it("missing paths become empty", () => {
    expect(renderTemplateString("x{{missing.y}}z", {})).toBe("xz");
  });

  it("renders subject/html/text together", () => {
    const r = renderEmailBodies(
      {
        subject: "Hi {{customer.first_name}}",
        htmlBody: "<p>{{{order.items_html}}}</p>",
        textBody: "Items:\n{{order.items_text}}",
      },
      {
        customer: { first_name: "Alex" },
        order: { items_html: "<b>1</b>", items_text: "- A" },
      },
    );
    expect(r.subject).toBe("Hi Alex");
    expect(r.html).toBe("<p><b>1</b></p>");
    expect(r.text).toContain("- A");
  });

  it("extracts variable paths", () => {
    const paths = extractTemplateVariablePaths("{{a.b}} {{{c.d}}} {{a.b}}");
    expect(paths).toEqual(["a.b", "c.d"]);
  });
});

describe("email template defaults", () => {
  it("provides defaults for every catalog key", () => {
    const all = getAllEmailTemplateDefaults();
    expect(all.map((d) => d.key).sort()).toEqual([...EMAIL_TEMPLATE_KEYS].sort());
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const d = getEmailTemplateDefault(key);
      expect(d.subject.length).toBeGreaterThan(0);
      expect(d.htmlBody.length).toBeGreaterThan(0);
      expect(d.textBody.length).toBeGreaterThan(0);
      const sample = sampleVarsForTemplate(key);
      const rendered = renderEmailBodies(
        { subject: d.subject, htmlBody: d.htmlBody, textBody: d.textBody },
        sample,
      );
      expect(rendered.subject).not.toMatch(/\{\{/);
      expect(rendered.html.length).toBeGreaterThan(50);
    }
  });
});
