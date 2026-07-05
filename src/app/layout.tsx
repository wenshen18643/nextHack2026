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

function SignedOutActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm font-medium text-milk-muted transition-colors hover:text-milk"
      >
        Sign in
      </Link>
      <Link
        href="/#pricing"
        className="rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-flame-deep"
      >
        Get protected
      </Link>
    </div>
  );
}

function SignedInActions({ full_name }: { full_name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium text-milk-muted sm:inline">Hi, {full_name}</span>
      <a
        href="/api/auth/logout"
        className="rounded-full border border-ink-lighter bg-void-lift px-4 py-2 text-sm font-semibold text-milk transition-all duration-200 hover:border-milk-faint hover:text-white"
      >
        Sign out
      </a>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session_user = read_session_user();

  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <header className="fixed top-0 z-40 w-full border-b border-ink-light/50 bg-void/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-milk">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-flame text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-lg tracking-tight">Sentinel</span>
              <span className="hidden text-sm font-normal text-milk-muted sm:inline">Scam Shield</span>
            </Link>
            <nav className="hidden gap-8 text-sm font-medium text-milk-muted md:flex">
              <Link href="/#how-it-works" className="transition-colors hover:text-milk">
                How it works
              </Link>
              <Link href="/#architecture" className="transition-colors hover:text-milk">
                Under the hood
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-milk">
                Pricing
              </Link>
              <Link href="/business-case" className="transition-colors hover:text-milk">
                Business Case
              </Link>
              <Link href="/demo-bank" className="transition-colors hover:text-milk">
                Demo Bank
              </Link>
            </nav>
            {session_user ? <SignedInActions full_name={session_user.full_name} /> : <SignedOutActions />}
          </div>
        </header>
        <main className="pt-[65px]">{children}</main>
        <footer className="border-t border-ink-light/50 bg-void-soft">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-10 text-sm text-milk-faint sm:flex-row sm:px-6">
            <p>Sentinel Scam Shield — built for NexHack 2026.</p>
            <p>Warns before the money moves. Never freezes your account.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
