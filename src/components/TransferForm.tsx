"use client";

import { useState } from "react";
import type { RiskAssessment } from "@/lib/risk/types";
import { FirewallModal } from "./FirewallModal";

interface TransferDraft {
  user_id: string;
  payee: string;
  amount: number;
  device: string;
  created_at: string;
}

interface Scenario {
  label: string;
  hint: string;
  draft: Omit<TransferDraft, "user_id">;
}

const demo_scenarios: Scenario[] = [
  {
    label: "Normal grocery run",
    hint: "Known payee, normal amount, trusted device → expect PASS",
    draft: {
      payee: "payee_grocer",
      amount: 200,
      device: "device_aisha_phone",
      created_at: "2026-06-26T18:00",
    },
  },
  {
    label: "Late-night new friend",
    hint: "New payee at 3 AM, normal amount → ambiguous, expect AI adjudication",
    draft: {
      payee: "payee_new_friend",
      amount: 260,
      device: "device_aisha_phone",
      created_at: "2026-06-26T03:00",
    },
  },
  {
    label: "Rapid cash-out (submit repeatedly)",
    hint: "Resubmit 4+ times fast to trip the velocity rule and escalate",
    draft: {
      payee: "payee_agent_x",
      amount: 500,
      device: "device_aisha_phone",
      created_at: "2026-06-26T02:00",
    },
  },
  {
    label: "Authorized-push scam",
    hint: "Huge transfer, brand-new payee, stranger device, 2 AM → expect DENY",
    draft: {
      payee: "payee_unknown_crypto",
      amount: 4800,
      device: "device_stranger",
      created_at: "2026-06-26T02:30",
    },
  },
];

const initial_draft: TransferDraft = {
  user_id: "user_aisha",
  ...demo_scenarios[0]!.draft,
};

/**
 * Converts a `datetime-local` value (which carries no timezone) into a UTC ISO
 * string the API and engine expect.
 */
function to_iso(datetime_local: string): string {
  return new Date(datetime_local).toISOString();
}

/**
 * Interactive eWallet transfer screen. It lets a demo operator submit transfers
 * (manually or via preset scam scenarios) and surfaces the firewall verdict in
 * a modal. Every submission is scored server-side by the risk engine.
 */
export function TransferForm() {
  const [draft, set_draft] = useState<TransferDraft>(initial_draft);
  const [assessment, set_assessment] = useState<RiskAssessment | null>(null);
  const [is_submitting, set_is_submitting] = useState(false);
  const [force_ai, set_force_ai] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  function apply_scenario(scenario: Scenario): void {
    set_draft((current) => ({ user_id: current.user_id, ...scenario.draft }));
  }

  async function submit_transfer(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    set_is_submitting(true);
    set_error(null);

    try {
      const endpoint = force_ai ? "/api/transfer?force_ai=1" : "/api/transfer";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          user_id: draft.user_id,
          payee: draft.payee,
          amount: Number(draft.amount),
          device: draft.device,
          geo: "MY",
          created_at: to_iso(draft.created_at),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Transfer evaluation failed.");
      }

      set_assessment((await response.json()) as RiskAssessment);
    } catch (caught) {
      set_error(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      set_is_submitting(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_280px]">
      <form onSubmit={submit_transfer} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Send money</h2>
        <p className="mt-1 text-sm text-ink-700">
          Every transfer is screened by the behavioral risk firewall before it leaves your wallet.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="block text-sm">
            <span className="font-medium">Account</span>
            <select
              value={draft.user_id}
              onChange={(event) => set_draft({ ...draft, user_id: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="user_aisha">Aisha Rahman</option>
              <option value="user_daniel">Daniel Lim</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Payee</span>
            <input
              value={draft.payee}
              onChange={(event) => set_draft({ ...draft, payee: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Amount (RM)</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={draft.amount}
              onChange={(event) => set_draft({ ...draft, amount: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Device</span>
            <input
              value={draft.device}
              onChange={(event) => set_draft({ ...draft, device: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Time</span>
            <input
              type="datetime-local"
              value={draft.created_at}
              onChange={(event) => set_draft({ ...draft, created_at: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        <label className="mt-5 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={force_ai}
            onChange={(event) => set_force_ai(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span>
            <span className="font-medium">Force AI adjudication</span>
            <span className="mt-0.5 block text-xs text-ink-700">
              Consult Kimi on every transfer, even obvious ones. Adds ~25-30s while the model reasons.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={is_submitting}
          className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {is_submitting ? "Screening…" : "Send transfer"}
        </button>
      </form>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700">
          Demo scenarios
        </h3>
        <ul className="mt-3 space-y-2">
          {demo_scenarios.map((scenario) => (
            <li key={scenario.label}>
              <button
                type="button"
                onClick={() => apply_scenario(scenario)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="font-medium text-ink-900">{scenario.label}</span>
                <span className="mt-0.5 block text-xs text-ink-700">{scenario.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {is_submitting ? <ScreeningOverlay force_ai={force_ai} /> : null}

      {assessment ? (
        <FirewallModal assessment={assessment} onClose={() => set_assessment(null)} />
      ) : null}
    </div>
  );
}

/**
 * Full-screen overlay shown while a transfer is being screened. It sets the
 * expectation that AI adjudication is a deliberate, multi-second reasoning step
 * rather than a hung request.
 *
 * @param force_ai Whether AI adjudication was forced, which lengthens the wait.
 */
function ScreeningOverlay({ force_ai }: { force_ai: boolean }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink-900/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-8 text-center shadow-xl">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
        <p className="mt-5 font-semibold">Screening transfer…</p>
        <p className="mt-1 text-sm text-ink-700">
          {force_ai
            ? "Kimi is reasoning about contextual scam risk. This can take 25-30 seconds."
            : "Running behavioral baseline and scam-signature rules."}
        </p>
      </div>
    </div>
  );
}
