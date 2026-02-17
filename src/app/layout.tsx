import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OrangeCursor } from "@/components/orange-cursor";
import "./globals.css";

const SITE_URL = "https://www.usetrail.in";
const SITE_TITLE = "Accrual | AI Accounting for SMBs";
const SITE_DESCRIPTION =
  "Accrual acts like an in-house finance hire by keeping books accurate, closing months on time, and flagging GST and cash risks before they grow.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Accrual",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/accrual-favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: ["/accrual-favicon.svg"],
    apple: [{ url: "/accrual-favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Accrual",
    images: [
      {
        url: "/accrual-favicon.svg",
        alt: "Accrual logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/accrual-favicon.svg"],
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
