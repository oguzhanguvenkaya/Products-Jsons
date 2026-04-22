import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Catalog Atelier — MTS Kimya",
  description:
    "MTS Kimya detailagent katalog bakım arayüzü. 511 ürünlük kataloğu ve bot prompt'larını güvenli staging ile düzenler.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* FOUC guard: apply persisted theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{var s=localStorage.getItem('catalog-atelier.theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var m=s||(d?'dark':'light');document.documentElement.dataset.theme=m;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-terracotta-500 focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-sm focus-visible:text-cream-50"
        >
          İçeriğe atla
        </a>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <Topbar />
            <main id="main" className="flex-1 overflow-auto" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
