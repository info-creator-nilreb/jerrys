import Image from "next/image";

/** Einzelbild auf der Produktkarte — serverseitig, festes Seitenverhältnis (CLS). */
export function ProductCardImage({
  url,
  alt,
  productTitle,
}: {
  url: string;
  alt: string;
  productTitle: string;
}) {
  return (
    <div className="relative aspect-square bg-(--surface-muted)">
      <Image
        src={url}
        alt={alt || productTitle}
        fill
        priority
        className="object-cover"
        sizes="(min-width:768px) 50vw, 100vw"
      />
    </div>
  );
}
