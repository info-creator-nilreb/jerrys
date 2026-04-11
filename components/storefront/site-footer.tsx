import Link from "next/link";
import { CookieSettingsButton } from "@/components/storefront/cookie-consent/cookie-settings-button";

const legalLinks = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerruf" },
  { href: "/versand", label: "Versand" },
] as const;

/** Dunkles Navy wie Admin-Sidebar; helle Schrift, Primärgrün für Links. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#182d4d] py-12 text-center text-[0.98rem] leading-relaxed text-white/90 sm:py-14 sm:text-base">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-lg font-medium text-white sm:text-xl">
          Design Katzenmöbel – in Deutschland designed und gefertigt.
        </p>
        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[0.95rem] sm:text-base"
          aria-label="Rechtliches"
        >
          {legalLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]"
            >
              {label}
            </Link>
          ))}
          <CookieSettingsButton className="font-medium text-primary underline-offset-4 transition-colors hover:text-(--primary-hover) hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#182d4d]" />
        </nav>
        <p className="mt-6 text-sm text-white/60 sm:text-base">© {new Date().getFullYear()} jerry&apos;s</p>
      </div>
    </footer>
  );
}
