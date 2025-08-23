import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TruckingPlatform - Collaborative Transportation Management",
  description:
    "Multi-tenant trucking collaboration platform with real-time communication",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
  <body className={inter.className}>{children}</body>
    </html>
  );
}
