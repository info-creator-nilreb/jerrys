"use client";

import { useCallback, useState } from "react";
import {
  slugFollowsTitle,
  slugifyTitle,
  type SlugifyTitleMode,
} from "@/lib/slug/slugify-title";

type Options = {
  initialTitle: string;
  initialSlug: string;
  /** catalog = Produkt/Kategorie/Kollektion; content = CMS-Seiten */
  mode?: SlugifyTitleMode;
  /** false z. B. Homepage mit festem Slug */
  enabled?: boolean;
};

export function useAutoSlugFromTitle({
  initialTitle,
  initialSlug,
  mode = "catalog",
  enabled = true,
}: Options) {
  const [title, setTitleState] = useState(initialTitle);
  const [slug, setSlugState] = useState(initialSlug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    () => enabled && !slugFollowsTitle(initialTitle, initialSlug, mode),
  );

  const setTitle = useCallback(
    (value: string) => {
      setTitleState(value);
      if (enabled && !slugManuallyEdited) {
        setSlugState(slugifyTitle(value, mode));
      }
    },
    [enabled, mode, slugManuallyEdited],
  );

  const setSlug = useCallback((value: string) => {
    setSlugState(value);
    setSlugManuallyEdited(true);
  }, []);

  /** Slug setzen ohne manuellen Modus (z. B. Homepage mit festem Slug). */
  const applySlug = useCallback((value: string, manual = false) => {
    setSlugState(value);
    if (manual) setSlugManuallyEdited(true);
    else setSlugManuallyEdited(false);
  }, []);

  const regenerateSlugFromTitle = useCallback(() => {
    setSlugState(slugifyTitle(title, mode));
    setSlugManuallyEdited(false);
  }, [mode, title]);

  return {
    title,
    setTitle,
    slug,
    setSlug,
    applySlug,
    slugManuallyEdited,
    regenerateSlugFromTitle,
  };
}
