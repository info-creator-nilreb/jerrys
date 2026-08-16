import Image from "next/image";
import { heroObjectPosition, type HeroSlide } from "@/lib/content/blocks/hero";

/** Serverseitiges Hero-Hintergrundbild (ein Slide, kein Client-JS). */
export function HeroBackgroundImage({ slide }: { slide: HeroSlide }) {
  const alt = slide.alt ?? "";
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src={slide.url}
        alt={alt}
        fill
        priority
        quality={90}
        className="object-cover"
        style={{ objectPosition: heroObjectPosition(slide) }}
        sizes="100vw"
        unoptimized={slide.url.startsWith("https://")}
      />
    </div>
  );
}
