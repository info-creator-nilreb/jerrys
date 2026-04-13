import { Heart, MapPin, Star } from "lucide-react";

type UspIconVariant = "design" | "germany" | "heart";

const iconClass =
  "flex size-10 shrink-0 items-center justify-center text-primary [&_svg]:stroke-[1.35]";

export function UspIcon({ variant }: { variant: UspIconVariant }) {
  return (
    <span className={iconClass} aria-hidden>
      {variant === "design" ? <Star className="size-10" strokeWidth={1.35} /> : null}
      {variant === "germany" ? <MapPin className="size-10" strokeWidth={1.35} /> : null}
      {variant === "heart" ? <Heart className="size-10" strokeWidth={1.35} /> : null}
    </span>
  );
}
