import {
  Gem,
  Heart,
  Layers,
  Leaf,
  MapPin,
  Palette,
  PawPrint,
  Ruler,
  Scale,
  Shield,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import type { PdpSpecIcon } from "@/lib/catalog/pdp-resolve-display";

const specIconClass = "size-5 shrink-0 text-primary";

export function PdpSpecIcon({ name }: { name: PdpSpecIcon }) {
  const props = { className: specIconClass, strokeWidth: 1.5 as const, "aria-hidden": true as const };
  switch (name) {
    case "ruler":
      return <Ruler {...props} />;
    case "scale":
      return <Scale {...props} />;
    case "layers":
      return <Layers {...props} />;
    case "palette":
      return <Palette {...props} />;
    case "map-pin":
      return <MapPin {...props} />;
    case "gem":
      return <Gem {...props} />;
    case "users":
      return <Users {...props} />;
    case "paw":
      return <PawPrint {...props} />;
    case "leaf":
      return <Leaf {...props} />;
    case "heart":
      return <Heart {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "flag-de":
      return <MapPin {...props} />;
    case "sparkles":
      return <Sparkles {...props} />;
    case "tag":
    default:
      return <Tag {...props} />;
  }
}
