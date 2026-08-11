import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import type { RichTextBlockData } from "@/lib/content/blocks/rich-text";
import { sanitizeContentRichTextHtml } from "@/lib/content/sanitize-content-html";

export function RichTextBlock({
  data,
  variant = "content",
}: {
  data: RichTextBlockData;
  blockId: string;
  variant?: "content" | "legal";
}) {
  if (variant === "legal") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <LegalHtmlBody html={data.html} />
      </section>
    );
  }

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
