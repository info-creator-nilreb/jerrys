-- Epic 12 Slice 5: Lookup previous_slug for permanent redirects after URL changes.
CREATE INDEX IF NOT EXISTS "content_pages_previous_slug_idx" ON "content_pages"("previous_slug");
