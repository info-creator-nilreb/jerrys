import type { RichTextBlockData } from "@/lib/content/blocks/rich-text";
import { sanitizeContentRichTextHtml } from "@/lib/content/sanitize-content-html";

export function RichTextBlock({ data }: { data: RichTextBlockData; blockId: string }) {
  const html = sanitizeContentRichTextHtml(data.html);
  if (!html) return null;
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <div
        className="prose prose-neutral max-w-none text-(--foreground) prose-headings:text-(--foreground-heading) prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
