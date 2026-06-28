import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Scam Shield",
  description:
    "A browser extension that warns users with AI before they send money to a likely scam.",
};

/**
 * Root layout providing the shared shell, navigation, and global styles for
 * every route in the Sentinel app.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
                S
              </span>
              <span>Sentinel</span>
              <span className="text-sm font-normal text-ink-700">Scam Shield</span>
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-ink-700">
              <Link href="/" className="hover:text-brand-600">
                Home
              </Link>
              <Link href="/demo-bank" className="hover:text-brand-600">
                Demo Bank
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
