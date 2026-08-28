import Image from "next/image";
import { socialFeedDesktopGridClass } from "@/lib/content/blocks/social-reviews";

export type HomepageSocialSlide = {
  id: string;
  url: string;
  alt: string;
  href: string | null;
};

function shouldOptimizeImage(url: string): boolean {
  if (url.startsWith("/api/")) return false;
  if (url.startsWith("/")) return true;
  return url.includes("blob.vercel-storage.com");
}

function SocialSlide({
  item,
  desktopColumns,
}: {
  item: HomepageSocialSlide;
  desktopColumns: number;
}) {
  const inner = (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-(--surface-muted) bg-(--surface-soft)">
      <Image
        src={item.url}
        alt={item.alt}
        fill
        className="object-cover"
        sizes={`(max-width: 767px) 50vw, ${Math.round(100 / desktopColumns)}vw`}
        unoptimized={!shouldOptimizeImage(item.url)}
        referrerPolicy="no-referrer"
      />
    </div>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block outline-none ring-primary focus-visible:ring-2"
      >
        {inner}
      </a>
    );
  }

  return inner;
}

export function HomepageSocialGrid({
  items,
  desktopColumns,
}: {
  items: HomepageSocialSlide[];
  desktopColumns: number;
}) {
  if (items.length === 0) return null;

  const columnClass = socialFeedDesktopGridClass(desktopColumns);

  return (
    <ul
      className={`mt-8 grid grid-cols-2 gap-3 md:mt-10 md:gap-4 ${columnClass}`}
      data-desktop-columns={desktopColumns}
    >
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <SocialSlide item={item} desktopColumns={desktopColumns} />
        </li>
      ))}
    </ul>
  );
}
