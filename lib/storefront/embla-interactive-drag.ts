import type { EmblaCarouselType } from "embla-carousel";

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, form, label";

/** Verhindert Embla-Drag bei Klicks auf Buttons/Links/Formulare im Karussell. */
export function shouldStartEmblaDrag(
  _emblaApi: EmblaCarouselType,
  event: MouseEvent | TouchEvent | PointerEvent,
): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return true;
  return target.closest(INTERACTIVE_SELECTOR) === null;
}

export const emblaInteractiveDragOptions = {
  watchDrag: shouldStartEmblaDrag,
} as const;
