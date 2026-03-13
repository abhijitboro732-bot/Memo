import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Free Online Tools",
    default: "Free Online Tools - Useful Utilities for Everyday",
  },
  description: "A collection of free, simple, and fast online tools including image converters, calculators, text utilities, and developer tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`}>
        <Header />
        
        {/* Google AdSense placeholder Below Header */}
        <div className="w-full bg-gray-50 flex justify-center py-4 border-b border-gray-100">
          <div className="text-sm text-gray-400 border border-dashed border-gray-300 w-full max-w-3xl h-24 flex items-center justify-center rounded">
            AdSense Placeholder (Below Header)
          </div>
        </div>

        <main className="flex-1 bg-white">{children}</main>
        
        <Footer />
      </body>
    </html>
  );
}
