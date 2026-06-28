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
}

/**
 * The AI's holistic verdict for one transfer.
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
  "You are a fraud-screening AI for Malaysian bank and e-wallet transfers (DuitNow, Touch 'n Go, Maybank, CIMB).",
  "You receive the COMPLETE context of a single outbound transfer as JSON and must judge scam/fraud risk before the user sends it.",
  "Weigh everything holistically: recipient name or account, amount, the reference/memo text, the channel, and timing.",
  "Account for Malaysian scam patterns: fake investments, crypto, loan and prize scams, romance/impersonation, mule accounts, and any wording that signals the user was coached or is paying a stranger.",
  "Treat self-incriminating memo text (e.g. naming the recipient a scammer) as a strong risk signal, not a joke.",
  "Output ONLY a raw JSON object, no markdown and no code fences: {\"risk_score\":0-100,\"advice\":\"allow|warn|block\",\"reason\":string}.",
  "Use allow for risk_score<30, warn for 30-69, block for 70+. Keep reason to one plain sentence the sender will read.",
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
 * Screens a transfer by handing the AI the entire context and returning its
 * holistic verdict.
 *
 * Fail-safe: on a missing key, timeout, transport error, or malformed response
 * it resolves to null so the caller can fall back rather than crash. JSON mode
 * is requested so the verdict parses reliably. Reuses the `KIMI_*` environment
 * configuration, which currently points at Groq.
 *
 * @param context The complete observed transfer.
 * @returns The AI verdict, or null when the model could not be consulted.
 */
export async function ai_screen_transfer(
  context: ScreenContext,
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
    console.log(`[screen-ai] calling ${base_url} model=${model} for payee="${context.payee}"`);
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
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: JSON.stringify(context, null, 2) },
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
    console.error("[screen-ai] screening error — falling back:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
