import type { FirewallState } from "@/lib/risk/types";

/**
 * Presentation metadata for a firewall state: how it is labeled, colored, and
 * what intervention copy the user should see. Kept separate from the engine so
 * visual changes never touch decision logic.
 */
export interface FirewallStatePresentation {
  label: string;
  badge_classes: string;
  intervention: string;
}

const presentations: Record<FirewallState, FirewallStatePresentation> = {
  PASS: {
    label: "Passed",
    badge_classes: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
    intervention: "Transfer completed instantly. No friction for normal behavior.",
  },
  INSPECT: {
    label: "Inspecting",
    badge_classes: "bg-amber-100 text-amber-800 ring-amber-600/20",
    intervention: "Step-up verification required before this transfer proceeds.",
  },
  QUARANTINE: {
    label: "Quarantined",
    badge_classes: "bg-orange-100 text-brand-700 ring-brand-600/20",
    intervention: "Transfer held for a cooling-off period. Confirm only if you trust this payee.",
  },
  DENY: {
    label: "Denied",
    badge_classes: "bg-rose-100 text-rose-800 ring-rose-600/20",
    intervention: "Transfer refused and escalated to the fraud operations queue.",
  },
};

/**
 * Resolves the presentation metadata for a firewall state.
 *
 * @param state The firewall state to present.
 * @returns Label, badge styling, and intervention copy for the state.
 */
export function present_firewall_state(state: FirewallState): FirewallStatePresentation {
  return presentations[state];
}
