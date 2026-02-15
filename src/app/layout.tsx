import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OrangeCursor } from "@/components/orange-cursor";
import "./globals.css";

const SITE_URL = "https://www.usetrail.in";
const SITE_TITLE = "trai\\ | AI Accounting for SMBs";
const SITE_DESCRIPTION =
  "trai\\ acts like an in-house finance hire by keeping books accurate, closing months on time, and flagging GST and cash risks before they grow.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "trai\\",
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
    siteName: "trai\\",
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
        <OrangeCursor />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
