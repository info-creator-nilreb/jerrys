import { StorefrontImage } from "@/components/storefront/storefront-image";

/** Einzelbild auf der Produktkarte — serverseitig, festes Seitenverhältnis (CLS). */
export function ProductCardImage({
  url,
  alt,
  productTitle,
  className = "aspect-square",
  sizes = "(min-width:768px) 50vw, 100vw",
}: {
  url: string;
  alt: string;
  productTitle: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={`relative bg-(--surface-muted) ${className}`.trim()}>
      <StorefrontImage
        src={url}
        alt={alt || productTitle}
        fill
        priority
        className="object-cover"
        sizes={sizes}
      />
    </div>
  );
}
