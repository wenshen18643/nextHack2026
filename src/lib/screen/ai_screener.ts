import { z } from "zod";

const default_base_url = "https://api.moonshot.cn/v1";
const default_model = "moonshot-v1-8k";
const default_temperature = 0.2;
const request_timeout_ms = 20000;

const verdict_schema = z.object({
  risk_score: z.number().min(0).max(100),
  advice: z.enum(["allow", "warn", "block"]),
  reason: z.string().min(1),
});

/**
 * The complete, provider-neutral picture of a transfer handed to the AI. Every
 * field the extension can observe is included so the model reasons over the
 * whole context rather than a pre-filtered subset. New fields added here are
 * automatically seen by the model because the prompt serializes the whole object.
 */
export interface ScreenContext {
  payee: string;
  amount: number;
  currency: string;
  memo?: string;
  channel: string;
  observed_at: string;
  prior_flag_count?: number;
}

/**
 * One finding from a deterministic specialist agent, forwarded verbatim to the
 * AI adjudicator so it rules on the same evidence the fusion layer scores.
 *
 * @property agent  Which specialist produced the finding (risk/behaviour/anomaly).
 * @property code   Stable machine identifier (e.g. "SCAM_KEYWORD").
 * @property weight Points the finding contributed to the deterministic score.
 * @property detail Human-readable description of what was observed.
 */
export interface SpecialistFinding {
  agent: string;
  code: string;
  weight: number;
  detail: string;
}

/**
 * Everything the AI adjudicator sees for one transfer: the raw observed
 * transfer, every specialist finding, and the deterministic score those
 * findings fused into. Serialized whole into the prompt so nothing is hidden
 * from the model.
 */
export interface AdjudicationInput {
  transfer: ScreenContext;
  specialist_findings: SpecialistFinding[];
  deterministic_score: number;
}

/**
 * The AI's adjudicated verdict for one transfer.
 *
 * @property risk_score Model-assigned risk in [0, 100].
 * @property advice     The action the user should take.
 * @property reason     One-sentence justification shown to the user.
 */
export interface AiScreenVerdict {
  risk_score: number;
  advice: "allow" | "warn" | "block";
  reason: string;
}

const system_prompt = [
  "You are the final fraud adjudicator for Malaysian bank and e-wallet transfers (DuitNow, Touch 'n Go, CIMB).",
  "You receive a JSON object with the COMPLETE observed transfer, the findings already raised by deterministic specialist agents (scam-vocabulary rules, this recipient's history, population anomalies), and the risk score those findings fused into.",
  "Your job is to adjudicate, not to guess independently: weigh the specialist findings together with the raw transfer details and deliver one coherent verdict.",
  "You may disagree with the specialists, but your reason MUST explicitly address the highest-weight finding — never call a memo generic or a transfer clean while a finding contradicts that.",
  "A small amount does NOT make a transfer safe: scammers probe with small test transfers, and memo wording (crypto, urgency, prizes, loans, investment returns) outweighs amount.",
  "Account for Malaysian scam patterns: fake investments, crypto, loan and prize scams, romance/impersonation, mule accounts, and any wording that signals the user was coached or is paying a stranger.",
  "Treat self-incriminating memo text (e.g. naming the recipient a scammer) as a strong risk signal, not a joke.",
  "When prior_flag_count is greater than zero, this exact recipient was flagged as suspicious before; treat that as a strong risk signal that compounds with the rest.",
  "Output ONLY a raw JSON object, no markdown and no code fences: {\"risk_score\":0-100,\"advice\":\"allow|warn|block\",\"reason\":string}.",
  "Use allow for risk_score<30, warn for 30-69, block for 70+. The reason must be one plain sentence the sender will read, and it must justify the risk_score you chose.",
].join(" ");

const max_response_tokens = 250;

/**
 * Extracts the first JSON object from a model response, tolerating fences or
 * surrounding prose the model may add despite instructions.
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
 * Adjudicates a transfer by handing the AI the raw transfer, every specialist
 * finding, and the deterministic score, then returning its holistic verdict.
 *
 * Fail-safe: on a missing key, timeout, transport error, or malformed response
 * it resolves to null so the caller can fall back to the deterministic verdict
 * rather than crash. JSON mode is requested so the verdict parses reliably.
 * Reuses the `KIMI_*` environment configuration.
 *
 * @param input The transfer, specialist findings, and deterministic score.
 * @returns The AI verdict, or null when the model could not be consulted.
 */
export async function ai_adjudicate_transfer(
  input: AdjudicationInput,
): Promise<AiScreenVerdict | null> {
  const api_key = process.env.KIMI_API_KEY;
  const base_url = process.env.KIMI_BASE_URL ?? default_base_url;
  const model = process.env.KIMI_MODEL ?? default_model;
  const temperature = Number(process.env.KIMI_TEMPERATURE ?? default_temperature);

  if (!api_key) {
    console.warn("[screen-ai] no KIMI_API_KEY set — falling back.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request_timeout_ms);

  try {
    console.log(
      `[screen-ai] adjudicating via ${base_url} model=${model} payee="${input.transfer.payee}" findings=${input.specialist_findings.length}`,
    );
    const response = await fetch(`${base_url}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: max_response_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: JSON.stringify(input, null, 2) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[screen-ai] HTTP ${response.status} — falling back. Body: ${await response.text()}`);
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("[screen-ai] empty model content — falling back.");
      return null;
    }

    console.log(`[screen-ai] raw verdict: ${content}`);
    return verdict_schema.parse(extract_json_object(content));
  } catch (error) {
    console.error("[screen-ai] adjudication error — falling back:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
