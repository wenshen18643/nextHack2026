import { score_cold_rules, type ColdTransfer } from "@/lib/screen/cold_rules";
import { log_event, summarize_signals } from "@/lib/observability/logging";
import type { RiskSignal } from "@/lib/risk/types";
import { ai_specialist_score } from "./ai_specialist";
import type { AgentReport, TransferContext } from "./types";

const risk_max_points = 34;

const risk_rule_guidance = [
  "A large absolute amount (roughly RM5000 and above) is a strong supporting clue, worth most of your budget on its own.",
  "A round-thousand amount (RM1000, RM2000, ...) correlates with mule cash-out extraction rather than organic spending; worth a modest share.",
  "Scam-script vocabulary in the payee or memo (investment, crypto, guarantees, urgency, prizes, refunds, police or bank-officer impersonation, loans, lottery, doubling money) is the dominant tell of an authorized-push-payment scam; worth most of your budget, and self-incriminating wording (e.g. naming the recipient a scammer) counts fully.",
  "A transfer initiated between 00:00 and 05:59 Malaysia time sits in the late-night window scam scripts exploit while support lines are closed; a smaller supporting clue, weighted higher when the sender is elderly (60+).",
  "Several weak clues lining up together (round amount + late night, for example) deserve more than their parts.",
];

/**
 * Risk agent: the history-free specialist.
 *
 * Judges the transfer on its own terms — amount, round-number patterns,
 * scam-script vocabulary, and Malaysian late-night timing — with no dependency
 * on stored history. The judgement is made by the AI, guided by the former
 * hard-coded rules and capped at this agent's point budget; when the AI is
 * unreachable the deterministic rules score instead, so the agent is always
 * available even on a cold database.
 *
 * @param context The observed transfer.
 * @returns The agent report carrying the history-free assessment.
 */
export async function run_risk_agent(context: TransferContext): Promise<AgentReport> {
  const assessment = await ai_specialist_score({
    agent_name: "risk",
    domain:
      "You judge only the transfer itself — amount, wording, and timing — with no knowledge of the sender's history.",
    max_points: risk_max_points,
    rule_guidance: risk_rule_guidance,
    payload: {
      payee: context.payee,
      amount: context.amount,
      currency: context.currency,
      memo: context.memo,
      observed_at: context.observed_at,
      observed_at_myt: context.observed_at_myt,
      sender_age: context.sender_age,
    },
  });

  if (!assessment) {
    const transfer: ColdTransfer = {
      payee: context.payee,
      amount: context.amount,
      memo: context.memo,
      observed_at: context.observed_at,
      sender_age: context.sender_age,
    };
    const signals = score_cold_rules(transfer);
    log_event("risk-agent", "AI unavailable — scored deterministic rules", {
      signals: summarize_signals(signals),
    });
    return { agent: "risk", signals };
  }

  const signals: RiskSignal[] =
    assessment.points > 0
      ? [
          {
            layer: "ai",
            code: "AI_RISK_ASSESSMENT",
            weight: assessment.points,
            detail: assessment.reason,
          },
        ]
      : [];
  log_event("risk-agent", "AI scored history-free risk", {
    points: assessment.points,
    signals: summarize_signals(signals),
  });
  return { agent: "risk", signals };
}
