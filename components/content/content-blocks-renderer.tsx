import { resolveContentBlockEntry } from "@/components/content/block-registry";
import { ContentBlockFallback } from "@/components/content/content-block-fallback";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import { isContentBlockType } from "@/lib/content/block-types";
import type { ContentBlockDTO } from "@/lib/content/content-pages";

/**
 * Rendert geordnete CMS-Blöcke (Server Components).
 * Unbekannte Typen / ungültige Payloads → Fallback (Production: unsichtbar).
 */
export async function ContentBlocksRenderer({
  blocks,
  pageType = "content",
}: {
  blocks: ContentBlockDTO[];
  pageType?: "homepage" | "content" | "legal";
}) {
  const ordered = [...blocks].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );

  const nodes = await Promise.all(
    ordered.map(async (block) => {
      if (!isContentBlockType(block.type)) {
        return (
          <ContentBlockFallback
            key={block.id}
            blockId={block.id}
            type={block.type}
            reason="unknown_type"
          />
        );
      }

      const entry = resolveContentBlockEntry(block.type);
      if (!entry) {
        return (
          <ContentBlockFallback
            key={block.id}
            blockId={block.id}
            type={block.type}
            reason="unknown_type"
          />
        );
      }

      const parsed = parseContentBlockData(block.type, block.data);
      if (!parsed.ok) {
        return (
          <ContentBlockFallback
            key={block.id}
            blockId={block.id}
            type={block.type}
            reason="invalid_data"
          />
        );
      }

      const Component = entry.Component as (props: {
        data: unknown;
        blockId: string;
        variant?: "content" | "legal";
      }) => React.ReactNode | Promise<React.ReactNode>;

      if (block.type === "richText") {
        return (
          <Component
            key={block.id}
            data={parsed.data}
            blockId={block.id}
            variant={pageType === "legal" ? "legal" : "content"}
          />
        );
      }

      return <Component key={block.id} data={parsed.data} blockId={block.id} />;
    }),
  );

  return <>{nodes}</>;
}
