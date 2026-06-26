"use client";

import { useEffect, useState } from "react";
import type { RiskAssessment, Transaction } from "@/lib/risk/types";
import { present_firewall_state } from "@/lib/ui/firewall_state";

interface DecisionRecord {
  transaction: Transaction;
  assessment: RiskAssessment;
  decided_at: string;
}

const refresh_interval_ms = 3000;
const intercepted_states = new Set(["QUARANTINE", "DENY"]);

/**
 * Derives headline KPIs from the decision log for the dashboard tiles.
 */
function compute_kpis(decisions: DecisionRecord[]) {
  const total = decisions.length;
  const intercepted = decisions.filter((record) =>
    intercepted_states.has(record.assessment.state),
  ).length;
  const passed = decisions.filter((record) => record.assessment.state === "PASS").length;
  const ai_adjudicated = decisions.filter((record) => record.assessment.ai_used).length;
  const frictionless_rate = total === 0 ? 0 : Math.round((passed / total) * 100);

  return { total, intercepted, ai_adjudicated, frictionless_rate };
}

/**
 * Live fraud-operations dashboard. It polls the decision API and renders KPI
 * tiles plus a newest-first feed of every firewall verdict with its score,
 * state, and reason for analyst review.
 */
export function OpsDashboard() {
  const [decisions, set_decisions] = useState<DecisionRecord[]>([]);

  useEffect(() => {
    let is_active = true;

    async function load_decisions(): Promise<void> {
      try {
        const response = await fetch("/api/decisions", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { decisions: DecisionRecord[] };
        if (is_active) {
          set_decisions(body.decisions);
        }
      } catch {
        return;
      }
    }

    void load_decisions();
    const timer = setInterval(load_decisions, refresh_interval_ms);
    return () => {
      is_active = false;
      clearInterval(timer);
    };
  }, []);

  const kpis = compute_kpis(decisions);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-4">
        <KpiTile label="Transfers screened" value={String(kpis.total)} />
        <KpiTile label="Fraud intercepted" value={String(kpis.intercepted)} accent />
        <KpiTile label="AI adjudicated" value={String(kpis.ai_adjudicated)} />
        <KpiTile label="Frictionless rate" value={`${kpis.frictionless_rate}%`} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Decision feed</h2>
      {decisions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-ink-700">
          No transfers screened yet. Submit a transfer from the eWallet to populate the feed.
        </p>
      ) : (
        <ul className="space-y-2">
          {decisions.map((record) => {
            const presentation = present_firewall_state(record.assessment.state);
            return (
              <li
                key={record.transaction.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${presentation.badge_classes}`}
                    >
                      {presentation.label}
                    </span>
                    <span className="truncate text-sm font-medium">
                      RM {record.transaction.amount} → {record.transaction.payee}
                    </span>
                    {record.assessment.ai_used ? (
                      <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">
                        AI
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-700">{record.assessment.reason}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold">{Math.round(record.assessment.score)}</div>
                  <div className="text-xs text-ink-700">score</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Single KPI tile.
 *
 * @param label  The metric name.
 * @param value  The formatted metric value.
 * @param accent Whether to emphasize the tile in the brand color.
 */
function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`text-2xl font-bold ${accent ? "text-brand-700" : "text-ink-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-ink-700">{label}</div>
    </div>
  );
}
