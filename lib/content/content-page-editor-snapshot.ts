/**
 * Serialisierter Editor-Stand für Dirty-Erkennung (Live-Vorschau / Speichern).
 * Nur Felder, die der Content-Page-Editor kontrolliert.
 */
export type ContentPageEditorSnapshotInput = {
  title: string;
  pageType: string;
  slug: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalPath: string;
  robotsIndex: boolean;
  showInFooter: boolean;
  blocksJson: string;
};

export function buildContentPageEditorSnapshot(
  input: ContentPageEditorSnapshotInput,
): string {
  return JSON.stringify({
    title: input.title.trim(),
    pageType: input.pageType,
    slug: input.slug.trim(),
    status: input.status,
    seoTitle: input.seoTitle.trim(),
    seoDescription: input.seoDescription.trim(),
    ogImageUrl: input.ogImageUrl.trim(),
    canonicalPath: input.canonicalPath.trim(),
    robotsIndex: input.robotsIndex,
    showInFooter: input.showInFooter,
    blocksJson: input.blocksJson,
  });
}
