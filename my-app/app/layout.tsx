import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Nexus Athletic Club — Nairobi | Premium Fitness & Access Control",
  description: "Next-generation athletic club, intelligent digital membership cards, and seamless contactless access scanner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#080808] text-[#f4f7f5] selection:bg-[#ff3b30] selection:text-[#ffffff]">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}


