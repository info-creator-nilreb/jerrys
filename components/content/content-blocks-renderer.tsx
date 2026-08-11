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
}: {
  blocks: ContentBlockDTO[];
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
      }) => React.ReactNode | Promise<React.ReactNode>;
      return <Component key={block.id} data={parsed.data} blockId={block.id} />;
    }),
  );

  return <>{nodes}</>;
}
