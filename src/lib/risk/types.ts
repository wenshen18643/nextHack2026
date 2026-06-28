/**
 * Core domain types for the Sentinel scam-screening engine.
 *
 * These types are the shared contract between the screening layers and the
 * score-to-state mapping. They contain no behavior so they can be imported by
 * both server and client code.
 */

/**
 * Layered position of a signal within the screening pipeline. Used for
 * explainability grouping and for weighting during score fusion.
 */
export type RiskLayer = "behavioral" | "rules" | "ai";

/**
 * Graduated firewall states, ordered from least to most restrictive. Each
 * state maps to a proportional user-facing intervention.
 */
export type FirewallState = "PASS" | "INSPECT" | "QUARANTINE" | "DENY";

/**
 * A single, explainable risk observation emitted by one screening layer.
 *
 * @property layer  Which layer produced the signal.
 * @property code   Stable machine identifier (e.g. "SCAM_KEYWORD").
 * @property weight Contribution to the raw score, in points (0-100 domain).
 * @property detail Human-readable reason shown to ops and, when relevant, users.
 */
export interface RiskSignal {
  layer: RiskLayer;
  code: string;
  weight: number;
  detail: string;
}
