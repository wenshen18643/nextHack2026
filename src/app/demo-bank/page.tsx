"use client";

import { useState } from "react";

/**
 * A self-contained mock bank transfer screen used to demonstrate the Sentinel
 * browser extension. It deliberately mimics a generic bank UI and exposes the
 * `data-sentinel-*` attributes the extension's demo adapter reads, so the
 * warning flow can be shown live without real bank credentials.
 *
 * The page itself does no screening; the extension interposes on the send
 * button exactly as it would on a real bank site.
 */
export default function DemoBankPage() {
  const [payee, set_payee] = useState("");
  const [amount, set_amount] = useState("");
  const [memo, set_memo] = useState("");
  const [sent, set_sent] = useState(false);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">DemoBank Transfer</h1>
      <p className="mt-1 text-sm text-ink-700">Send money to anyone, instantly.</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Recipient</span>
          <input
            data-sentinel-payee
            value={payee}
            onChange={(event) => set_payee(event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2"
            placeholder="Name or account number"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Amount (MYR)</span>
          <input
            data-sentinel-amount
            value={amount}
            onChange={(event) => set_amount(event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2"
            placeholder="0.00"
            inputMode="decimal"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Reference</span>
          <input
            data-sentinel-memo
            value={memo}
            onChange={(event) => set_memo(event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2"
            placeholder="Optional note"
          />
        </label>

        <button
          data-sentinel-send
          type="button"
          onClick={() => set_sent(true)}
          className="w-full rounded-lg bg-ink-900 px-4 py-3 font-semibold text-white"
        >
          Send money
        </button>

        {sent && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            Transfer of MYR {amount || "0"} to {payee || "recipient"} completed.
          </p>
        )}
      </div>
    </div>
  );
}
