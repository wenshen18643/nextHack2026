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
    "When the evidence includes orchestrator_briefing, that is a targeted instruction from the orchestrator agent for this specific transfer — address it explicitly in your judgement.",
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
  const raw = await request_kimi_json(
    `${request.agent_name}-specialist`,
    build_system_prompt(request),
    request.payload,
  );
  if (raw === null) {
    return null;
  }
  try {
    const parsed = assessment_schema.parse(raw);
    return {
      points: clamp_specialist_points(parsed.points, request.max_points),
      reason: parsed.reason,
    };
  } catch (error) {
    console.error(`[${request.agent_name}-specialist] malformed assessment — falling back to rules:`, error);
    return null;
  }
}

/**
 * Sends one JSON-mode chat completion to the configured OpenAI-compatible
 * provider and returns the parsed JSON object from its reply.
 *
 * The shared transport beneath every agent in the chain (orchestrator,
 * specialists). Fail-safe: on a missing key, timeout, transport error, or
 * unparseable content it resolves to null and logs under the given label so
 * each caller can apply its own fallback.
 *
 * @param agent_label   Label used in log lines (e.g. "risk-specialist").
 * @param system_prompt The agent's full system prompt.
 * @param payload       The evidence object serialized as the user message.
 * @returns The parsed JSON reply, or null when the model could not be consulted.
 */
async function request_kimi_json(
  agent_label: string,
  system_prompt: string,
  payload: Record<string, unknown>,
): Promise<unknown | null> {
  const api_key = process.env.KIMI_API_KEY;
  const base_url = process.env.KIMI_BASE_URL ?? default_base_url;
  const model = process.env.KIMI_MODEL ?? default_model;
  const temperature = Number(process.env.KIMI_TEMPERATURE ?? default_temperature);

  if (!api_key) {
    console.warn(`[${agent_label}] no KIMI_API_KEY set — falling back.`);
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
          { role: "system", content: system_prompt },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(
        `[${agent_label}] HTTP ${response.status} — falling back. Body: ${await response.text()}`,
      );
      return null;
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      console.warn(`[${agent_label}] empty model content — falling back.`);
      return null;
    }
    return extract_json_object(content);
  } catch (error) {
    console.error(`[${agent_label}] request error — falling back:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const briefing_schema = z.object({
  risk: z.string().min(1),
  behaviour: z.string().min(1),
  anomaly: z.string().min(1),
});

/**
 * The orchestrator agent's dispatch plan: one targeted briefing per specialist
 * telling it what to scrutinize on this specific transfer.
 */
export type OrchestratorBriefings = z.infer<typeof briefing_schema>;

const orchestrator_system_prompt = [
  "You are the orchestrator agent of a multi-agent Malaysian bank-transfer scam screen.",
  "You dispatch three specialist agents that always run in parallel: 'risk' judges the transfer itself (amount, wording, Malaysia-time timing), 'behaviour' judges the sender's history with this recipient, and 'anomaly' judges the transfer against the whole recorded population.",
  "Given the observed transfer, write one short, targeted briefing per specialist naming what to scrutinize on THIS transfer — the sharpest question each should answer, not a restatement of its job description.",
  'Output ONLY a raw JSON object, no markdown: {"risk":string,"behaviour":string,"anomaly":string}.',
].join(" ");

/**
 * Orchestrator agent: plans the fan-out by writing a targeted briefing for
 * each specialist based on the observed transfer.
 *
 * Advisory by design: all three specialists always run in parallel regardless
 * of what the orchestrator says, so a hallucinated or failed plan can never
 * skip evidence. Fail-safe: resolves to null when the model is unreachable and
 * the specialists simply run unbriefed.
 *
 * @param transfer The observed transfer fields relevant to planning.
 * @returns One briefing per specialist, or null when the model could not be consulted.
 */
export async function ai_orchestrate_briefings(
  transfer: Record<string, unknown>,
): Promise<OrchestratorBriefings | null> {
  const raw = await request_kimi_json("orchestrator", orchestrator_system_prompt, transfer);
  if (raw === null) {
    return null;
  }
  try {
    return briefing_schema.parse(raw);
  } catch (error) {
    console.error("[orchestrator] malformed briefing — specialists run unbriefed:", error);
    return null;
  }
}
