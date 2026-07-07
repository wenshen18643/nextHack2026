/**
 * Landing page for Stripe Checkout redirects. Stripe sends the payer here with
 * ?state=success after payment or ?state=cancelled after backing out; the
 * extension popup picks up the new entitlement on its next status check.
 */
export default function BillingResultPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const paid = searchParams.state === "success";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">{paid ? "🛡️" : "↩️"}</div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          {paid ? "You're Pro now" : "Payment cancelled"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {paid
            ? "Sentinel Scam Shield Pro is active on your account. Reopen the extension popup — it will show your Pro badge."
            : "No charge was made. You can upgrade any time from the extension popup."}
        </p>
        <p className="mt-6 text-xs text-slate-400">You can close this tab.</p>
      </div>
    </main>
  );
}
