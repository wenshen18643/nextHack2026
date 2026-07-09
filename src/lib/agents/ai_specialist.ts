import { z } from "zod";

const default_base_url = "https://api.deepseek.com/v1";
const default_model = "deepseek-chat";
const default_temperature = 0.2;
const request_timeout_ms = 15000;
const max_response_tokens = 200;

const assessment_schema = z.object({
  points: z.number(),
  reason: z.string().min(1),
});

/**
 * One rule-guided AI specialist's judgement of a transfer within its domain.
 *
 * @property points Risk points awarded, already clamped to the agent's budget.
 * @property reason One-sentence justification for the points.
 */
export interface SpecialistAssessment {
  points: number;
  reason: string;
}

/**
 * A scoring request for one AI specialist.
 *
 * @property agent_name    Which specialist is judging (risk/behaviour/anomaly).
 * @property domain        One sentence describing what this specialist judges.
 * @property max_points    The most points this specialist may award.
 * @property rule_guidance The former hard-coded rules, handed to the model as
 *                         guidance it weighs freely rather than thresholds it
 *                         must obey.
 * @property payload       The evidence for this domain, serialized verbatim
 *                         into the prompt.
 */
export interface SpecialistScoreRequest {
  agent_name: string;
  domain: string;
  max_points: number;
  rule_guidance: string[];
  payload: Record<string, unknown>;
}

/**
 * Clamps a model-proposed point value into the specialist's budget, mapping
 * non-finite garbage to zero so a malformed response can never inflate risk.
 *
 * @param points     The raw points the model proposed.
 * @param max_points The specialist's budget ceiling.
 * @returns An integer in [0, max_points].
 */
export function clamp_specialist_points(points: number, max_points: number): number {
  if (!Number.isFinite(points)) {
    return 0;
  }
  return Math.min(max_points, Math.max(0, Math.round(points)));
}

/**
 * Builds the system prompt that turns the former hard-coded rules into
 * judgement guidance for one specialist.
 */
function build_system_prompt(request: SpecialistScoreRequest): string {
  return [
    `You are the ${request.agent_name} specialist inside a Malaysian bank and e-wallet transfer scam screen (DuitNow, Touch 'n Go, CIMB).`,
    request.domain,
    `You award between 0 and ${request.max_points} risk points for your domain alone; other specialists cover everything else, so never judge outside your domain.`,
    "Use the following rule guidance as calibrated judgement, not rigid thresholds — you may award points for a pattern the rules only approximate, and withhold points when the letter of a rule fires but the transfer is clearly benign:",
    ...request.rule_guidance.map((rule) => `- ${rule}`),
    "All wall-clock reasoning uses Malaysia time (UTC+8); when the evidence includes observed_at_myt, that is the sender's local time.",
    `Output ONLY a raw JSON object, no markdown: {"points":0-${request.max_points},"reason":"one plain sentence citing the evidence"}.`,
  ].join("\n");
}

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
 * Asks the AI to score one specialist domain, guided by that domain's rules.
 *
 * Fail-safe by design: on a missing key, timeout, transport error, or
 * malformed response it resolves to null so the caller can fall back to the
 * deterministic rule scorer instead of failing the screen. Points are clamped
 * into the specialist's budget so the model can never exceed its share of the
 * total score. Reuses the `KIMI_*` environment configuration.
 *
 * @param request The specialist identity, budget, rules, and evidence.
 * @returns The clamped assessment, or null when the model could not be consulted.
 */
export async function ai_specialist_score(
  request: SpecialistScoreRequest,
): Promise<SpecialistAssessment | null> {
  const api_key = process.env.KIMI_API_KEY;
  const base_url = process.env.KIMI_BASE_URL ?? default_base_url;
  const model = process.env.KIMI_MODEL ?? default_model;
  const temperature = Number(process.env.KIMI_TEMPERATURE ?? default_temperature);

  if (!api_key) {
    console.warn(`[${request.agent_name}-specialist] no KIMI_API_KEY set — falling back to rules.`);
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
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: max_response_tokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: build_system_prompt(request) },
          { role: "user", content: JSON.stringify(request.payload, null, 2) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(
        `[${request.agent_name}-specialist] HTTP ${response.status} — falling back to rules. Body: ${await response.text()}`,
      );
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      console.warn(`[${request.agent_name}-specialist] empty model content — falling back to rules.`);
      return null;
    }

    const parsed = assessment_schema.parse(extract_json_object(content));
    return {
      points: clamp_specialist_points(parsed.points, request.max_points),
      reason: parsed.reason,
    };
  } catch (error) {
    console.error(`[${request.agent_name}-specialist] scoring error — falling back to rules:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
