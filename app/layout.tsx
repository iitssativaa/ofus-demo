import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "@/components/final-fidelity.css";
import "@/components/chart-fidelity.css";
import "@/components/motion-toast.css";
import Script from "next/script";
import { ToastViewport } from "@/components/toast";



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
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#F5F6FB" /><Script src="/ofus/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body
        className="antialiased"
      >
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}


