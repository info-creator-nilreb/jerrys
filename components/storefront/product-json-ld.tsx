import { JsonLdScript } from "@/components/storefront/json-ld-script";
import {
  buildProductOfferJsonLd,
  type ProductOfferJsonLdInput,
} from "@/lib/site/structured-data";

type Props = ProductOfferJsonLdInput;

export function ProductJsonLd(props: Props) {
  return <JsonLdScript data={buildProductOfferJsonLd(props)} />;
}
