import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import { WebVitalsReporter } from "@/components/storefront/web-vitals-reporter";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

const siteOrigin = canonicalSiteOrigin();

export const metadata: Metadata = {
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
  title: {
    default: "jerry's – Katzenmöbel Made in Germany",
    template: "%s | jerry's",
  },
  description:
    "Design Katzenmöbel – in Deutschland designed und gefertigt. Hohe Qualität, besonderes Design, langlebige Materialien.",
  icons: {
    icon: "/branding/favicon.ico",
  },
  openGraph: {
    siteName: "jerry's",
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
