import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAuth Ready: how long until your users can connect?",
  description: "Setup and approval guides for provider OAuth apps, for developers building AI agents. Effort, waiting time, blockers, and what an agent can do for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <TopBar />
        {children}
        <footer className="footer">
          OAuth Ready is a take-home prototype. Its visual style follows Composio&apos;s dashboard; it is not a Composio product. Guides are a starting point: every claim shows where it came from, and anything marked Unverified should be checked before you plan around it.
        </footer>
      </body>
    </html>
  );
}
