import { Suspense } from "react";
import { resolveContentBlockEntry } from "@/components/content/block-registry";
import { ContentBlockFallback } from "@/components/content/content-block-fallback";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import {
  isContentBlockType,
  type ContentBlockType,
} from "@/lib/content/block-types";
import type { ContentBlockDTO } from "@/lib/content/content-pages";

/** Blöcke mit DB-/Netzwerk-IO — einzeln streamen, damit Hero/TTFB nicht warten. */
const STREAMED_BLOCK_TYPES = new Set<ContentBlockType>([
  "productCategoryPick",
  "curatedProductList",
  "socialReviews",
  "workshopCalendar",
]);

function streamedBlockFallback(type: ContentBlockType) {
  if (type === "curatedProductList" || type === "productCategoryPick") {
    return (
      <div
        className="min-h-[28rem] bg-(--surface-soft) px-4 py-16 md:min-h-[32rem] md:py-20"
        aria-hidden
      />
    );
  }
  if (type === "socialReviews") {
    return (
      <div
        className="min-h-56 border-y border-(--surface-muted) bg-(--surface-soft)"
        aria-hidden
      />
    );
  }
  return <div className="min-h-40 bg-(--surface-soft)/60" aria-hidden />;
}

async function ResolvedContentBlock({
  block,
  pageType,
}: {
  block: ContentBlockDTO;
  pageType: "homepage" | "content" | "legal";
}) {
  if (!isContentBlockType(block.type)) {
    return (
      <ContentBlockFallback
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
        data={parsed.data}
        blockId={block.id}
        variant={pageType === "legal" ? "legal" : "content"}
      />
    );
  }

  return <Component data={parsed.data} blockId={block.id} />;
}

/**
 * Rendert geordnete CMS-Blöcke (Server Components).
 * Sync-Blöcke (Hero, USP, …) sofort; DB-Blöcke hinter Suspense für früheres TTFB/LCP.
 */
export function ContentBlocksRenderer({
  blocks,
  pageType = "content",
}: {
  blocks: ContentBlockDTO[];
  pageType?: "homepage" | "content" | "legal";
}) {
  const ordered = [...blocks].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );

  return (
    <>
      {ordered.map((block) => {
        const type = isContentBlockType(block.type) ? block.type : null;
        const stream = type != null && STREAMED_BLOCK_TYPES.has(type);

        if (!stream || type == null) {
          return (
            <ResolvedContentBlock
              key={block.id}
              block={block}
              pageType={pageType}
            />
          );
        }

        return (
          <Suspense key={block.id} fallback={streamedBlockFallback(type)}>
            <ResolvedContentBlock block={block} pageType={pageType} />
          </Suspense>
        );
      })}
    </>
  );
}
