import type {
  BehaviorProfile,
  RiskAssessment,
  Transaction,
} from "@/lib/risk/types";
import { build_seed_dataset, type SeedUser } from "./seed";

/**
 * A persisted firewall decision joined to its originating transaction, used by
 * the ops dashboard feed.
 */
export interface DecisionRecord {
  transaction: Transaction;
  assessment: RiskAssessment;
  decided_at: string;
}

/**
 * In-memory persistence for the demo. It mirrors the Supabase schema in
 * `supabase/schema.sql` so swapping to a live database is a drop-in change of
 * this module only. State is seeded once at module load.
 */
class InMemoryRepository {
  private readonly users = new Map<string, SeedUser>();
  private readonly profiles = new Map<string, BehaviorProfile>();
  private readonly transactions_by_user = new Map<string, Transaction[]>();
  private readonly decisions: DecisionRecord[] = [];

  constructor() {
    const dataset = build_seed_dataset();
    for (const user of dataset.users) {
      this.users.set(user.id, user);
    }
    for (const profile of dataset.profiles) {
      this.profiles.set(profile.user_id, profile);
    }
    for (const transaction of dataset.transactions) {
      this.append_transaction(transaction);
    }
  }

  private append_transaction(transaction: Transaction): void {
    const existing = this.transactions_by_user.get(transaction.user_id) ?? [];
    existing.push(transaction);
    this.transactions_by_user.set(transaction.user_id, existing);
  }

  /**
   * Lists all seeded users for the demo account picker.
   */
  list_users(): SeedUser[] {
    return [...this.users.values()];
  }

  /**
   * Resolves a user's behavioral baseline.
   *
   * @param user_id The owning user.
   * @returns The profile, or null when the user is unknown.
   */
  get_profile(user_id: string): BehaviorProfile | null {
    return this.profiles.get(user_id) ?? null;
  }

  /**
   * Returns a user's recent transactions, newest first.
   *
   * @param user_id The owning user.
   * @param limit   Maximum number of transactions to return.
   * @returns The most recent transactions for the user.
   */
  get_recent_transactions(user_id: string, limit = 20): Transaction[] {
    const all = this.transactions_by_user.get(user_id) ?? [];
    return [...all]
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, limit);
  }

  /**
   * Persists a completed evaluation and its transaction to the decision log.
   *
   * @param transaction The evaluated transfer.
   * @param assessment  The firewall verdict for that transfer.
   * @returns The stored decision record.
   */
  record_decision(transaction: Transaction, assessment: RiskAssessment): DecisionRecord {
    this.append_transaction(transaction);
    const record: DecisionRecord = {
      transaction,
      assessment,
      decided_at: new Date().toISOString(),
    };
    this.decisions.unshift(record);
    return record;
  }

  /**
   * Returns the most recent firewall decisions for the ops feed.
   *
   * @param limit Maximum number of decisions to return.
   * @returns Decisions ordered newest first.
   */
  list_decisions(limit = 50): DecisionRecord[] {
    return this.decisions.slice(0, limit);
  }
}

const global_repository = globalThis as unknown as {
  __sentinel_repository?: InMemoryRepository;
};

/**
 * Returns the process-wide repository singleton, surviving Next.js hot reloads
 * so the decision log is not wiped on every code change in development.
 *
 * @returns The shared in-memory repository.
 */
export function get_repository(): InMemoryRepository {
  if (!global_repository.__sentinel_repository) {
    global_repository.__sentinel_repository = new InMemoryRepository();
  }
  return global_repository.__sentinel_repository;
}
