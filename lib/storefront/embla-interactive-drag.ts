import type { EmblaCarouselType } from "embla-carousel";

/** Nur echte Steuerelemente — Links sind bewusst erlaubt (Embla unterscheidet Klick vs. Drag). */
const NO_DRAG_SELECTOR =
  "button, input, textarea, select, form, [data-carousel-control]";

/** Verhindert Embla-Drag bei Klicks auf Buttons/Formulare im Karussell. */
export function shouldStartEmblaDrag(
  _emblaApi: EmblaCarouselType,
  event: MouseEvent | TouchEvent | PointerEvent,
): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return true;
  return target.closest(NO_DRAG_SELECTOR) === null;
}

export const emblaInteractiveDragOptions = {
  watchDrag: shouldStartEmblaDrag,
} as const;
