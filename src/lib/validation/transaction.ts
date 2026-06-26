import { z } from "zod";

/**
 * Boundary validation for incoming transfer requests.
 *
 * Parsing untrusted input through this schema guarantees the risk engine only
 * ever sees well-formed transactions, eliminating defensive checks downstream.
 */
export const transaction_schema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  payee: z.string().min(1),
  amount: z.number().positive().finite(),
  device: z.string().min(1),
  geo: z.string().min(1).optional(),
  created_at: z.string().datetime(),
});

/**
 * Shape of a validated transfer request, inferred from {@link transaction_schema}.
 */
export type TransactionInput = z.infer<typeof transaction_schema>;

/**
 * Validates and normalizes a raw transfer payload.
 *
 * @param payload Untrusted input, typically a parsed request body.
 * @returns The validated transaction.
 * @throws {z.ZodError} When the payload violates the schema.
 */
export function parse_transaction(payload: unknown): TransactionInput {
  return transaction_schema.parse(payload);
}
