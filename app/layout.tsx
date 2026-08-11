import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import { WebVitalsReporter } from "@/components/storefront/web-vitals-reporter";
import { getShopSettings } from "@/lib/shop/shop-settings";
import {
  buildShopMetadata,
  shopThemeStyle,
} from "@/lib/shop/storefront-branding";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getShopSettings();
  return buildShopMetadata(settings);
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getShopSettings();
  return {
    themeColor: settings.primaryColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getShopSettings();
  const themeStyle = shopThemeStyle(settings);

  return (
    <html
      lang="de"
      className={`${sourceSans.variable} h-full antialiased`}
      style={themeStyle}
    >
      <body className="min-h-full flex flex-col font-sans">
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
