/**
 * Einfache Shopify-/Liquid-ähnliche Platzhalter:
 * - `{{ path.to.value }}` → HTML-escapet
 * - `{{{ path.to.value }}}` → roh (für vorgerendertes HTML)
 * Fehlende Pfade → leerer String.
 */

export type TemplateVars = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lookupPath(vars: TemplateVars, path: string): unknown {
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let cur: unknown = vars;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * Ersetzt `{{{raw}}}` und `{{escaped}}` in subject/html/text.
 * Reihenfolge: zuerst unescaped Triple-Mustaches, dann escaped Double.
 */
export function renderTemplateString(template: string, vars: TemplateVars): string {
  const withRaw = template.replace(/\{\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}\}/g, (_m, path: string) => {
    return stringifyValue(lookupPath(vars, path));
  });
  return withRaw.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, path: string) => {
    return escapeHtml(stringifyValue(lookupPath(vars, path)));
  });
}

export function renderEmailBodies(
  input: { subject: string; htmlBody: string; textBody: string },
  vars: TemplateVars,
): { subject: string; html: string; text: string } {
  return {
    subject: renderTemplateString(input.subject, vars),
    html: renderTemplateString(input.htmlBody, vars),
    text: renderTemplateString(input.textBody, vars),
  };
}

/** Alle `{{…}}` / `{{{…}}}`-Pfade in einem Template (für Validierung/Hinweise). */
export function extractTemplateVariablePaths(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(/\{\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}\}/g)) {
    if (m[1]) found.add(m[1]);
  }
  return [...found].sort();
}
