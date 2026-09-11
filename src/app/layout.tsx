import type { Metadata } from "next";
import {
  Fraunces,
  Instrument_Serif,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";

import { SiteNav } from "@/features/sentinel/components/site-nav";
import { SentinelStoreProvider } from "@/features/sentinel/store/sentinel-store";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orchestrator | Hybrid Placement",
  description:
    "Policy-driven placement for one AI workload across cloud, on-prem, and air-gapped environments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${instrumentSerif.variable} ${jakarta.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-full bg-paper-0 text-ink-1">
        <SentinelStoreProvider>
          <div className="flex min-h-screen flex-col items-stretch lg:flex-row">
            <SiteNav />
            <main className="flex min-w-0 flex-1 flex-col gap-6 px-5 pt-7 pb-16 sm:px-8">
              {children}
            </main>
          </div>
        </SentinelStoreProvider>
      </body>
    </html>
  );
}
