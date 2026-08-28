import Image, { type ImageProps } from "next/image";
import {
  normalizeStorefrontProductImageUrl,
  shouldOptimizeStorefrontImage,
} from "@/lib/catalog/storefront-product-image";

type Props = Omit<ImageProps, "src" | "unoptimized"> & { src: string };

/** next/image für Katalogmedien: Blob/lokal optimieren, Shopify-CDN direkt laden. */
export function StorefrontImage({ src, referrerPolicy, ...rest }: Props) {
  const url = normalizeStorefrontProductImageUrl(src);
  if (!url) return null;
  return (
    <Image
      {...rest}
      src={url}
      unoptimized={!shouldOptimizeStorefrontImage(url)}
      referrerPolicy={referrerPolicy ?? "no-referrer"}
    />
  );
}
