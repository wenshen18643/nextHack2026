/**
 * Core domain types for the Sentinel behavioral risk firewall.
 *
 * These types are the shared contract between the risk-engine layers, the
 * decision state machine, and the persistence/UI surfaces. They contain no
 * behavior so they can be imported by both server and client code.
 */

/**
 * Layered position of a signal within the defense pipeline. Used for
 * explainability grouping and for weighting during score fusion.
 */
export type RiskLayer = "behavioral" | "rules" | "ai";

/**
 * Graduated firewall states, ordered from least to most restrictive. Each
 * state maps to a proportional user-facing intervention.
 */
export type FirewallState = "PASS" | "INSPECT" | "QUARANTINE" | "DENY";

/**
 * A single, explainable risk observation emitted by one engine layer.
 *
 * @property layer  Which defense layer produced the signal.
 * @property code   Stable machine identifier (e.g. "FIRST_TIME_PAYEE").
 * @property weight Contribution to the raw score, in points (0-100 domain).
 * @property detail Human-readable reason shown to ops and, when relevant, users.
 */
export interface RiskSignal {
  layer: RiskLayer;
  code: string;
  weight: number;
  detail: string;
}

/**
 * A money-movement request to be evaluated. Geo/device are optional because
 * not every channel supplies them; the engine degrades gracefully when absent.
 */
export interface Transaction {
  id: string;
  user_id: string;
  payee: string;
  amount: number;
  device: string;
  geo?: string;
  created_at: string;
}

/**
 * Rolling behavioral baseline for one user, derived from transaction history.
 *
 * @property avg_amount     Mean transfer amount over the baseline window.
 * @property stddev_amount  Standard deviation of transfer amounts.
 * @property common_payees  Payees the user has transacted with before.
 * @property active_hours   Hours (0-23, local) the user normally transacts in.
 * @property known_devices  Device fingerprints previously seen for the user.
 */
export interface BehaviorProfile {
  user_id: string;
  avg_amount: number;
  stddev_amount: number;
  common_payees: string[];
  active_hours: number[];
  known_devices: string[];
}

/**
 * Final, fully-explainable verdict for a single transaction.
 *
 * @property score    Fused risk score in the closed interval [0, 100].
 * @property state    Firewall state derived from the score thresholds.
 * @property reason   Concise plain-language summary of the decision.
 * @property signals  Every signal that contributed to the score.
 * @property ai_used  Whether the AI adjudicator layer was invoked.
 */
export interface RiskAssessment {
  score: number;
  state: FirewallState;
  reason: string;
  signals: RiskSignal[];
  ai_used: boolean;
}
