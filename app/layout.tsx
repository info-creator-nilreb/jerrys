import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
