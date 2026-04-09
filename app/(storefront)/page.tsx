import Image from "next/image";
import { HeroScrollHint } from "@/components/storefront/hero-scroll-hint";
import { UspIcon } from "@/components/storefront/usp-icons";

const usps = [
  {
    icon: "design" as const,
    title: "Ausgezeichnetes Design",
    body: "Funktionalität und zeitloses Design – ausgezeichnet u. a. mit dem Plus X Award.",
  },
  {
    icon: "germany" as const,
    title: "Made in Germany",
    body: "Hochwertige, robuste Materialien und Fertigung in Deutschland für eure Stubentiger.",
  },
  {
    icon: "heart" as const,
    title: "Ein Herz für Tiere",
    body: "Für jedes verkaufte Produkt spenden wir 1 Euro an den Tierschutz.",
  },
];

const products = [
  {
    id: "katzenhoehle",
    href: "#produkte",
    title: "Design Katzenhöhle",
    subtitle: "Katzenhöhle mit Stil – für Auge und Gaumen",
    price: "79,00 €",
    image: "/media/katzenhoehle.jpg",
    alt: "Design Katzenhöhle von jerry's in Edelweiß",
  },
  {
    id: "futternapf",
    href: "#produkte",
    title: "Design Futternapf",
    subtitle: "Futternapf mit dem gewissen Etwas",
    price: "24,00 €",
    image: "/media/futternapf.jpg",
    alt: "Design Futternapf von jerry's",
  },
];

export default function StorefrontHomePage() {
  return (
    <div>
      {/* Eine Viewporthöhe; Text links (freier Bildbereich), kein Karten-Overlay über dem Produkt */}
      <section className="relative h-dvh max-h-dvh overflow-hidden">
        <Image
          src="/media/hero-mood.jpg"
          alt=""
          fill
          priority
          quality={90}
          className="object-cover object-[40%_center] md:object-[35%_32%]"
          sizes="100vw"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-linear-to-r from-black/55 via-black/20 to-transparent md:from-black/45 md:via-black/10 md:to-transparent"
          aria-hidden
        />
        <div className="relative z-10 flex h-full flex-col px-4 pt-24 pb-16 md:px-8 md:pt-28 md:pb-20 lg:px-12">
          <div className="flex max-w-lg flex-1 flex-col justify-center">
            <p className="text-sm font-medium tracking-wide text-primary uppercase [text-shadow:0_0_20px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.35)]">
              Lieben Katz und Mensch
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl [text-shadow:0_0_28px_rgba(0,0,0,0.5),0_2px_12px_rgba(0,0,0,0.45)]">
              Katzenhöhle mit Stil
            </h1>
          </div>
          <HeroScrollHint />
        </div>
      </section>

      <section id="nach-hero" className="mx-auto max-w-6xl px-4 py-16 md:py-20 scroll-mt-[5.5rem]">
        <h2 className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
          Funktion trifft Design
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-center text-(--foreground-muted)">
          Katzenmöbel, die sich nahtlos in deine vier Wände einfügen – von jerry&apos;s, made in
          Germany.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {usps.map((u) => (
            <article
              key={u.title}
              className="rounded-lg border border-(--surface-muted) bg-white p-6 text-center shadow-sm"
            >
              <div className="flex flex-col items-center">
                <UspIcon variant={u.icon} />
                <h3 className="mt-4 text-lg font-semibold text-(--foreground-heading)">
                  {u.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-(--foreground-muted)">{u.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="produkte" className="scroll-mt-20 bg-(--surface-soft) px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
            Produkte
          </h2>
          <p className="mt-2 max-w-2xl text-(--foreground-muted)">
            Katalog und Warenkorb werden im nächsten Schritt angebunden – die Darstellung orientiert
            sich an jerry-s.com.
          </p>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {products.map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm"
              >
                <div className="relative aspect-square bg-(--surface-muted)">
                  <Image
                    src={p.image}
                    alt={p.alt}
                    fill
                    className="object-cover"
                    sizes="(min-width:768px) 50vw, 100vw"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-(--foreground-heading)">{p.title}</h3>
                  <p className="mt-1 text-sm text-(--foreground-muted)">{p.subtitle}</p>
                  <p className="mt-4 text-lg font-semibold text-primary">{p.price}*</p>
                  <a
                    href={p.href}
                    className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Details folgen
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
