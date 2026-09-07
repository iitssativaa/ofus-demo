import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "OfUs — Birlikte Çalışmanın En Net Hali",
    applicationName: "OfUs",
    description: "İki kişilik ekipler için sakin, hızlı ve anlaşılır iş yönetimi.",
    icons: { icon: "/favicon.png" },
    openGraph: { title: "OfUs — Birlikte Çalışmanın En Net Hali", description: "İki kişilik ekipler için sakin, hızlı ve anlaşılır iş yönetimi.", images: [{ url: `${origin}/og.png`, width: 1792, height: 1024 }] },
    twitter: { card: "summary_large_image", title: "OfUs — Birlikte Çalışmanın En Net Hali", description: "İki kişilik ekipler için sakin, hızlı ve anlaşılır iş yönetimi.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0b111a" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
