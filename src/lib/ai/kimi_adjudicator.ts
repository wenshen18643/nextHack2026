import { z } from "zod";
import type { AiAdjudicator } from "@/lib/risk/engine";
import type { RiskSignal, Transaction } from "@/lib/risk/types";

const request_timeout_ms = 30000;
const default_base_url = "https://api.moonshot.cn/v1";
const default_model = "moonshot-v1-8k";
const default_temperature = 0.2;
const default_user_agent = "sentinel-firewall/1.0";
const max_ai_weight = 40;

const adjudication_schema = z.object({
  abstain: z.boolean().default(false),
  risk_delta: z.number().min(0).max(max_ai_weight).default(0),
  code: z.string().default("AI_CONTEXT_RISK"),
  detail: z.string().default(""),
});

const system_prompt = [
  "You are a fraud-risk adjudicator for an eWallet firewall.",
  "Deterministic layers already scored this transfer into an ambiguous band.",
  "Judge only the contextual scam risk the rules may have missed.",
  "Respond with strict JSON: {\"abstain\":bool,\"risk_delta\":0-40,\"code\":string,\"detail\":string}.",
  "Set abstain=true when you cannot add signal. Keep detail to one sentence.",
].join(" ");

/**
 * Builds the user prompt describing the transaction and the signals the
 * deterministic layers already raised.
 */
function build_user_prompt(
  transaction: Transaction,
  deterministic_signals: RiskSignal[],
): string {
  const signal_lines =
    deterministic_signals.map((signal) => `- ${signal.code}: ${signal.detail}`).join("\n") ||
    "- none";
  return [
    "Transaction:",
    `  amount: ${transaction.amount}`,
    `  payee: ${transaction.payee}`,
    `  device: ${transaction.device}`,
    `  time: ${transaction.created_at}`,
    "Existing signals:",
    signal_lines,
  ].join("\n");
}

/**
 * Extracts the first JSON object from a model response, tolerating code fences
 * or surrounding prose the model may add despite instructions.
 */
function extract_json_object(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response.");
  }
  return JSON.parse(content.slice(start, end + 1));
}

/**
 * Creates an {@link AiAdjudicator} backed by the Kimi (Moonshot) chat API.
 *
 * The returned adjudicator is fail-safe: on a missing key, timeout, transport
 * error, malformed response, or an explicit abstain it resolves to null, so the
 * deterministic verdict always stands and a flaky LLM can never block transfers.
 *
 * @returns An adjudicator suitable for injection into the risk engine.
 */
export function create_kimi_adjudicator(): AiAdjudicator {
  const api_key = process.env.KIMI_API_KEY;
  const base_url = process.env.KIMI_BASE_URL ?? default_base_url;
  const model = process.env.KIMI_MODEL ?? default_model;
  const temperature = Number(process.env.KIMI_TEMPERATURE ?? default_temperature);
  const user_agent = process.env.KIMI_USER_AGENT ?? default_user_agent;

  return async function adjudicate(
    transaction: Transaction,
    deterministic_signals: RiskSignal[],
  ): Promise<RiskSignal | null> {
    if (!api_key) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

    try {
      const response = await fetch(`${base_url}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${api_key}`,
          "user-agent": user_agent,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: build_user_prompt(transaction, deterministic_signals) },
          ],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = adjudication_schema.parse(extract_json_object(content));
      if (parsed.abstain || parsed.risk_delta <= 0) {
        return null;
      }

      return {
        layer: "ai",
        code: parsed.code,
        weight: parsed.risk_delta,
        detail: parsed.detail || "AI flagged contextual scam risk.",
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };
}
