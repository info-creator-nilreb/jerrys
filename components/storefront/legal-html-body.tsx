import { sanitizeLegalDocumentHtml } from "@/lib/legal/sanitize-legal-html";

/**
 * Rendert CMS-HTML; Abstände per Nachfahren-Selektoren, da `space-y-*` bei
 * `dangerouslySetInnerHTML` keine Geschwister-Knoten im React-Baum erzeugt.
 */
export function LegalHtmlBody({ html }: { html: string }) {
  const clean = sanitizeLegalDocumentHtml(html);
  return (
    <div
      className="legal-html text-pretty [&_a]:break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors hover:[&_a]:text-(--primary-hover) focus-visible:[&_a]:rounded-sm focus-visible:[&_a]:text-(--primary-hover) focus-visible:[&_a]:outline focus-visible:[&_a]:outline-2 focus-visible:[&_a]:outline-offset-2 focus-visible:[&_a]:outline-primary/70 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-(--surface-muted) [&_blockquote]:pl-4 [&_blockquote]:text-(--foreground-muted) [&_font]:text-inherit [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-(--foreground-heading) [&_h2:first-child]:mt-0 [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-(--foreground-heading) [&_hr]:my-8 [&_hr]:border-(--surface-muted) [&_li]:break-words [&_li]:text-(--foreground-muted) [&_li]:marker:text-(--foreground-muted) [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:text-(--foreground-muted) [&_p]:mb-3.5 [&_p]:text-(--foreground-muted) [&_p:last-child]:mb-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_td]:border [&_td]:border-(--surface-muted) [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-(--surface-muted) [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-(--foreground-heading) [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-(--foreground-muted) [&_ul_ul]:mt-2"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
