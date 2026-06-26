import type { BehaviorProfile, Transaction } from "./types";

/**
 * Test and seed fixtures modeling a representative low-risk user. Centralized
 * so unit tests and the demo seed share one source of truth.
 */
export const baseline_profile: BehaviorProfile = {
  user_id: "user_001",
  avg_amount: 200,
  stddev_amount: 50,
  common_payees: ["payee_landlord", "payee_mom", "payee_grocer"],
  active_hours: [8, 9, 12, 18, 19, 20, 21],
  known_devices: ["device_pixel_home"],
};

/**
 * Builds a transaction from partial overrides on top of a normal-looking base,
 * keeping individual tests focused on the one attribute under examination.
 *
 * @param overrides Fields to override on the canonical normal transaction.
 * @returns A complete transaction ready for evaluation.
 */
export function make_transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn_001",
    user_id: "user_001",
    payee: "payee_grocer",
    amount: 180,
    device: "device_pixel_home",
    geo: "MY",
    created_at: "2026-06-26T12:00:00.000Z",
    ...overrides,
  };
}
