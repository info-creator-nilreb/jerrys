"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import {
  normalizeStorefrontProductImageUrl,
  shouldOptimizeStorefrontImage,
} from "@/lib/catalog/storefront-product-image";

type Props = Omit<ImageProps, "src" | "unoptimized"> & { src: string };

/** next/image für Katalogmedien: Blob/lokal optimieren, Shopify-CDN direkt laden. */
export function StorefrontImage({ src, referrerPolicy, onError, ...rest }: Props) {
  const url = normalizeStorefrontProductImageUrl(src);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <Image
      {...rest}
      src={url}
      unoptimized={!shouldOptimizeStorefrontImage(url)}
      referrerPolicy={referrerPolicy ?? "no-referrer"}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
