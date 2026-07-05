import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { read_session_user } from "@/lib/auth/session";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sentinel — Scam Shield",
  description:
    "A browser extension that warns users with AI before they send money to a likely scam.",
};

/**
 * Signed-out header actions: sign-in link plus the primary install CTA.
 */
function SignedOutActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-600"
      >
        Sign in
      </Link>
      <Link
        href="/#pricing"
        className="rounded-full bg-gradient-to-r from-brand-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5"
      >
        Get protected
      </Link>
    </div>
  );
}

/**
 * Signed-in header actions: greets the user by name and offers sign-out.
 */
function SignedInActions({ full_name }: { full_name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium text-ink-700 sm:inline">Hi, {full_name}</span>
      <a
        href="/api/auth/logout"
        className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-all duration-200 hover:bg-brand-50 hover:text-brand-600"
      >
        Sign out
      </a>
    </div>
  );
}

/**
 * Root layout providing the shared shell, navigation, session state, and
 * global styles for every route in the Sentinel app.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session_user = read_session_user();

  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-amber-500 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <span>Sentinel</span>
              <span className="hidden text-sm font-normal text-ink-500 sm:inline">Scam Shield</span>
            </Link>
            <nav className="hidden gap-6 text-sm font-medium text-ink-700 md:flex">
              <Link href="/#how-it-works" className="transition-colors hover:text-brand-600">
                How it works
              </Link>
              <Link href="/#architecture" className="transition-colors hover:text-brand-600">
                Under the hood
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-brand-600">
                Pricing
              </Link>
              <Link href="/business-case" className="transition-colors hover:text-brand-600">
                Business Case
              </Link>
              <Link href="/demo-bank" className="transition-colors hover:text-brand-600">
                Demo Bank
              </Link>
            </nav>
            {session_user ? <SignedInActions full_name={session_user.full_name} /> : <SignedOutActions />}
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:px-6">
            <p>Sentinel Scam Shield — built for NexHack 2026, Track 2: Fintech Risk & Fraud Intelligence.</p>
            <p>Warns before the money moves. Never freezes your account.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
