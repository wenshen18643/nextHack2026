import { evaluate_transaction } from "./engine";
import type { RiskAssessment } from "./types";
import { parse_transaction } from "@/lib/validation/transaction";
import { get_repository } from "@/lib/db/repository";
import { create_kimi_adjudicator } from "@/lib/ai/kimi_adjudicator";

const kimi_adjudicator = create_kimi_adjudicator();

/**
 * Error raised when a transfer references a user without a behavioral profile.
 */
export class UnknownUserError extends Error {
  constructor(user_id: string) {
    super(`No behavioral profile for user ${user_id}.`);
    this.name = "UnknownUserError";
  }
}

/**
 * Validates a raw transfer payload, evaluates it through the full firewall, and
 * persists the resulting decision to the audit log.
 *
 * @param payload Untrusted transfer request, typically a parsed request body.
 * @returns The firewall assessment for the transfer.
 * @throws {z.ZodError}      When the payload fails schema validation.
 * @throws {UnknownUserError} When the user has no behavioral profile.
 */
export async function evaluate_and_record(payload: unknown): Promise<RiskAssessment> {
  const transaction = parse_transaction(payload);
  const repository = get_repository();

  const profile = repository.get_profile(transaction.user_id);
  if (!profile) {
    throw new UnknownUserError(transaction.user_id);
  }

  const recent_transactions = repository.get_recent_transactions(transaction.user_id);

  const assessment = await evaluate_transaction({
    transaction,
    profile,
    recent_transactions,
    adjudicator: kimi_adjudicator,
  });

  repository.record_decision(transaction, assessment);
  return assessment;
}
