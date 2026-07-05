"use client";

import { useState } from "react";

/**
 * Props for the review card: the transfer as confirmed-but-not-yet-sent.
 *
 * @property payee  Recipient display name.
 * @property amount Transfer amount in MYR.
 * @property memo   Reference the sender typed.
 */
interface ReviewCardProps {
  payee: string;
  amount: number;
  memo: string;
}

/**
 * Renders a bank-style pre-OTP review screen as labeled plain-text rows with a
 * confirm button. It deliberately exposes no data-sentinel attributes: the
 * extension's generic review-page reader must recover the transfer purely from
 * the label/value layout, exactly as it would on an unadapted real bank.
 */
export default function ReviewCard({ payee, amount, memo }: ReviewCardProps) {
  const [confirmed, set_confirmed] = useState(false);
  const formatted_amount = `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const rows: Array<[string, string]> = [
    ["Transfer to", payee],
    ["Bank", "DemoBank Berhad"],
    ["Account number", "8601234567"],
    ["Amount", formatted_amount],
    ["Reference", memo || "-"],
  ];

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Confirm your transfer</h1>
      <p className="mt-1 text-sm text-ink-700">
        Please review the details below before confirming.
      </p>

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-300">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-ink-700">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => set_confirmed(true)}
        className="mt-6 w-full rounded-lg bg-ink-900 px-4 py-3 font-semibold text-white"
      >
        Confirm transfer
      </button>

      {confirmed && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Transfer of {formatted_amount} to {payee} completed.
        </p>
      )}
    </div>
  );
}
