import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://skipsee.com'),
  title: "Skipsee — Social Video Platform",
  description: "Discover short videos, connect with strangers, watch live streams, and share your world with Skipsee.",
  keywords: "social media, short videos, live streaming, video chat, social platform, skipsee",
  icons: {
    icon: '/favicon.svg?v=5',
    apple: '/favicon.svg?v=5',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
