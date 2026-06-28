import Link from "next/link";

/**
 * Landing route for Sentinel Scam Shield: explains the product and points to
 * the demo bank page where the browser extension can be seen intercepting a
 * risky transfer.
 */
export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold">Sentinel Scam Shield</h1>
        <p className="mt-2 max-w-2xl text-ink-700">
          A browser extension that warns you before you send money to a likely scam. It reads the
          transfer on your bank&apos;s page, asks an AI to judge the full context, and shows a
          warning the instant something looks wrong — all before the money moves.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold">1. Intercept</h2>
          <p className="mt-1 text-sm text-ink-700">
            Catches the Send click on a supported bank page before it submits.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold">2. Screen with AI</h2>
          <p className="mt-1 text-sm text-ink-700">
            Sends the full transfer context to the AI, which decides allow, warn, or block.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold">3. Warn</h2>
          <p className="mt-1 text-sm text-ink-700">
            Shows a clear warning so you can cancel before the money leaves your account.
          </p>
        </div>
      </section>

      <section>
        <Link
          href="/demo-bank"
          className="inline-block rounded-lg bg-ink-900 px-5 py-3 font-semibold text-white"
        >
          Open the demo bank →
        </Link>
        <p className="mt-2 text-sm text-ink-700">
          Load the unpacked extension, then try a transfer here to see the shield in action.
        </p>
      </section>
    </div>
  );
}
