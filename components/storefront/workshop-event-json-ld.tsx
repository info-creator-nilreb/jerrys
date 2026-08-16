import { JsonLdScript } from "@/components/storefront/json-ld-script";
import {
  buildWorkshopEventJsonLd,
  type WorkshopEventJsonLdInput,
} from "@/lib/site/structured-data";

type Props = WorkshopEventJsonLdInput;

export function WorkshopEventJsonLd(props: Props) {
  return <JsonLdScript data={buildWorkshopEventJsonLd(props)} />;
}
