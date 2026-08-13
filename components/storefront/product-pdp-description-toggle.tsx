"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  panelId: string;
};

/**
 * Klappt die serverseitig gerenderte Beschreibung auf/zu (kein HTML im Client).
 */
export function ProductPdpDescriptionToggle({ panelId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);

  useEffect(() => {
    const el = document.getElementById(panelId);
    if (!el) return;

    const measure = () => {
      if (el.classList.contains("line-clamp-none")) {
        setNeedsClamp(true);
        return;
      }
      setNeedsClamp(el.scrollHeight > el.clientHeight + 2);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [panelId, expanded]);

  useEffect(() => {
    const el = document.getElementById(panelId);
    if (!el) return;
    const fade = document.getElementById(`${panelId}-fade`);
    if (expanded) {
      el.classList.remove("line-clamp-5");
      el.classList.add("line-clamp-none");
      fade?.classList.add("hidden");
    } else {
      el.classList.add("line-clamp-5");
      el.classList.remove("line-clamp-none");
      if (needsClamp) fade?.classList.remove("hidden");
      else fade?.classList.add("hidden");
    }
  }, [expanded, needsClamp, panelId]);

  if (!needsClamp && !expanded) return null;

  return (
    <button
      type="button"
      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-(--primary-hover)"
      aria-expanded={expanded}
      aria-controls={panelId}
      onClick={() => setExpanded((v) => !v)}
    >
      {expanded ? (
        <>
          Weniger anzeigen
          <ChevronUp className="size-4" aria-hidden strokeWidth={2} />
        </>
      ) : (
        <>
          Mehr anzeigen
          <ChevronDown className="size-4" aria-hidden strokeWidth={2} />
        </>
      )}
    </button>
  );
}
