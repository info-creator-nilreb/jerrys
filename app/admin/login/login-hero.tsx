import Image from "next/image";

export function LoginHero({
  className,
  heroImageUrl,
  tagline,
}: {
  className?: string;
  /** null = dezenter Verlauf ohne fremdes Markenmotiv. */
  heroImageUrl: string | null;
  tagline: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className ?? ""}`}>
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt=""
          fill
          priority
          className="object-cover object-[center_35%]"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      ) : (
        <div
          className="absolute inset-0 bg-linear-to-br from-zinc-800 via-zinc-900 to-zinc-950"
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-black/10"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col justify-end p-6 text-white sm:p-8 lg:p-12">
        <p className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Hallo!</p>
        <p className="mt-1 text-lg font-medium text-white/95 sm:text-xl lg:mt-2 lg:text-2xl">
          Willkommen zurück.
        </p>
        <p className="mt-6 text-[0.7rem] leading-relaxed text-white/60 sm:mt-10 sm:text-xs">
          {tagline}
        </p>
      </div>
    </div>
  );
}
