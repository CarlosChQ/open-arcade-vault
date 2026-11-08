import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Courier_Prime,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { SiteFooter } from "./components/site-footer";
import { SiteNav, SiteNavFallback } from "./components/site-nav";
import { UserProvider } from "./components/user-context";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "Juega online, compite por la mayor cantidad de puntos y entra al salón de la fama de Arcade Vault.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" aria-hidden="true" />
        <div className="av-noise" aria-hidden="true" />
        <div className="av-app">
          <UserProvider>
            <Suspense fallback={<SiteNavFallback />}>
              <SiteNav />
            </Suspense>
            <main className="av-main">{children}</main>
            <SiteFooter />
          </UserProvider>
        </div>
      </body>
    </html>
  );
}
