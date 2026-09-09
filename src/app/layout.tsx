import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelGrid | Cyber Incident Response AI",
  description:
    "Policy-driven hybrid AI orchestration for cybersecurity operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
