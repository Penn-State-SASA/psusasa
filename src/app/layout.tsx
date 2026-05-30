import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://psusasa.com"),
  title: {
    default: "SASA | Penn State South Asian Student Association",
    template: "%s | SASA at Penn State",
  },
  description:
    "Fostering an environment at Penn State that allows students of South Asian heritage to share and promote their culture. Celebrating South Asian Heritage in Happy Valley since 1960.",
  openGraph: {
    title: "SASA | Penn State South Asian Student Association",
    description:
      "Fostering an environment at Penn State that allows students of South Asian heritage to share and promote their culture. Celebrating South Asian Heritage in Happy Valley since 1960.",
    url: "/",
    siteName: "Penn State SASA",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/sasa-logo.png",
        alt: "Penn State SASA logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SASA | Penn State South Asian Student Association",
    description:
      "Celebrating South Asian Heritage in Happy Valley since 1960.",
    images: ["/sasa-logo.png"],
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#5bbad5",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "SASA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${inter.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
