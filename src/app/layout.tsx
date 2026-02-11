import type { Metadata } from "next";
import { OrangeCursor } from "@/components/orange-cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lev | AI Accounting for SMBs",
  description:
    "Lev acts like an in-house finance hire by keeping books accurate, closing months on time, and flagging GST and cash risks before they grow.",
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
      </body>
    </html>
  );
}
