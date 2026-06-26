"use client";

import type { RiskAssessment } from "@/lib/risk/types";
import { present_firewall_state } from "@/lib/ui/firewall_state";

const layer_labels: Record<string, string> = {
  behavioral: "Behavioral",
  rules: "Scam rules",
  ai: "AI adjudicator",
};

/**
 * Modal that surfaces the firewall verdict for a transfer: the state, the fused
 * score, the plain-language reason, the intervention, and every contributing
 * signal grouped by layer for full explainability.
 *
 * @param assessment The firewall verdict to display.
 * @param onClose    Invoked when the user dismisses the modal.
 */
export function FirewallModal({
  assessment,
  onClose,
}: {
  assessment: RiskAssessment;
  onClose: () => void;
}) {
  const presentation = present_firewall_state(assessment.state);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${presentation.badge_classes}`}
            >
              {presentation.label}
            </span>
            <p className="mt-3 text-sm text-ink-700">{presentation.intervention}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-ink-900">{Math.round(assessment.score)}</div>
            <div className="text-xs uppercase tracking-wide text-ink-700">risk score</div>
            {assessment.ai_used ? (
              <span className="mt-1 inline-block rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                AI adjudicated
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-ink-800">
          {assessment.reason}
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-700">
            Contributing signals
          </h3>
          {assessment.signals.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">No risk signals fired.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {assessment.signals.map((signal) => (
                <li
                  key={`${signal.layer}-${signal.code}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-ink-900">{signal.code}</span>
                    <span className="block text-xs text-ink-700">{signal.detail}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-ink-700">{layer_labels[signal.layer]}</span>
                    <span className="font-semibold text-brand-600">+{Math.round(signal.weight)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-ink-900 px-4 py-2.5 font-medium text-white hover:bg-ink-800"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
