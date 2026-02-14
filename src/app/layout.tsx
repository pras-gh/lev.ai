import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OrangeCursor } from "@/components/orange-cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "trai\\ | AI Accounting for SMBs",
  description:
    "trai\\ acts like an in-house finance hire by keeping books accurate, closing months on time, and flagging GST and cash risks before they grow.",
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
