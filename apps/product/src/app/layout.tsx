import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BRAND_NAME, brandTagline } from "@trai/ui";
import { OrangeCursor } from "@/components/orange-cursor";
import { Providers } from "@/components/providers";
import "./globals.css";

const SITE_URL = "https://www.usetrailai.com";
const SITE_TITLE = `${BRAND_NAME} Product`;
const SITE_DESCRIPTION = `${brandTagline()}.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/trai-favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: ["/trai-favicon.svg"],
    apple: [{ url: "/trai-favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: BRAND_NAME,
    images: [
      {
        url: "/trai-favicon.svg",
        alt: "trai\\ logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/trai-favicon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <OrangeCursor />
          {children}
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
