# PLAN.md — Sentinel: The Behavioral Risk Firewall

> NexHack 2026 · Track 2 (Fintech Risk & Fraud Intelligence)
> An AI-driven fraud protection framework for eWallets that intercepts high-risk transfers before money leaves the user.

---

## 1. The Pitch (Problem → Solution)

**Problem.** eWallet scams (mule transfers, social-engineering, "authorized push payment" fraud) succeed because the victim *authorizes* the transfer. Static limits (e.g. "max RM5,000/day") are blunt: they block legitimate users and wave through scams that fit under the cap. Once funds leave, recovery is near-zero.

**Solution.** A **behavioral risk firewall**. Every transfer passes through a real-time risk pipeline that scores it against the user's *own* behavioral baseline plus known scam signatures. Anomalous transfers are not silently allowed or hard-denied — they escalate through a graduated **firewall state** (`PASS → INSPECT → QUARANTINE → DENY`) with an **explainable reason** and a user-facing intervention (cooling-off, step-up auth, scam warning).

**Why it wins the rubric.** Not a chatbot. It is an agentic, explainable, proactive risk system with a clear buyer (eWallet operators, neobanks, BNPL) and a measurable KPI (fraud loss prevented vs. false-positive friction).

---

## 2. Core Concept: The Risk Firewall

Borrowed from network security: every packet (transfer) is inspected and filtered against policy before it is allowed through. Instead of a binary allow/deny, the firewall escalates proportionally to risk. State machine:

| State | Trigger (risk score) | User experience |
|---|---|---|
| `PASS` | low | Transfer proceeds instantly |
| `INSPECT` | medium | Step-up auth (PIN/biometric/OTP) + transparent reason |
| `QUARANTINE` | high | Time-delayed (cooling-off) + scam-pattern warning + confirm |
| `DENY` | critical | Transfer refused, case raised to ops review queue |

The state is **dynamic per transaction**, never a fixed daily cap. Same user, same amount, different context → different decision.

---

## 3. Risk Engine: Layered Defense

Three layers feed one **risk score (0–100)**. Each layer emits structured *signals* so the decision is fully explainable.

**Layer 1 — Behavioral Baseline (deterministic, fast).**
Per-user rolling profile: typical amount range, frequent payees, active hours, device/geo. New transfer compared via z-score / percentile deviation. Pure DB + math — `O(1)` lookup, no LLM. Catches "this is wildly outside your normal."

**Layer 2 — Scam Signature Rules (deterministic, fast).**
Curated rule set for known fraud patterns: first-time payee + large amount, rapid drain after dormancy, new device + new payee, round-number cash-out chains, velocity spikes (N transfers in M minutes). Each rule = a weighted signal. Transparent, auditable, no black box.

**Layer 3 — AI Adjudicator (LLM, selective).**
Invoked **only** when Layers 1–2 land in the ambiguous mid-band (avoids cost + latency on obvious cases). The LLM receives the structured signals + recent transaction narrative and returns: refined risk score, a plain-language explanation, and a recommended intervention. This is the "intelligent" layer that reasons about *context* a rule can't (e.g. "salary just arrived, then full amount sent to a brand-new payee at 2 AM — classic mule pattern").

**Fusion.** `final_score = weighted_blend(layer1, layer2, layer3?)`. Deterministic layers gate LLM use → cheap, fast, and the LLM never decides alone.

---

## 4. Architecture

```
┌──────────────┐     transfer request      ┌──────────────────────────┐
│  Next.js UI  │ ─────────────────────────▶ │  /api/transfer (route)   │
│ (eWallet)    │ ◀───────────────────────── │  zod-validated payload   │
└──────────────┘  firewall decision + why   └────────────┬─────────────┘
                                                          │
                                              ┌───────────▼────────────┐
                                              │   Risk Engine (lib)    │
                                              │  ┌──────────────────┐  │
                                              │  │ L1 Behavioral    │  │
                                              │  │ L2 Scam Rules    │  │
                                              │  │ L3 LLM (Kimi)*   │  │
                                              │  └────────┬─────────┘  │
                                              │   score → state machine│
                                              └───────────┬────────────┘
                                                          │
                              ┌───────────────────────────▼──────────────┐
                              │ Supabase: users, profiles, transactions,  │
                              │ signals, decisions (audit log)            │
                              └───────────────────────────────────────────┘
                                  * LLM called only in mid-band
```

**Stack (already scaffolded):** Next.js 14 (App Router) · TypeScript · Supabase (Postgres + Auth) · Zod (boundary validation) · Vitest (tests) · Kimi (LLM adjudicator, keys already in `.env`).

---

## 5. Data Model (Supabase)

| Table | Key columns | Purpose |
|---|---|---|
| `users` | id, name, created_at | Account holder |
| `behavior_profiles` | user_id, avg_amount, stddev_amount, common_payees[], active_hours[], known_devices[] | Rolling baseline (Layer 1) |
| `transactions` | id, user_id, payee, amount, device, geo, created_at | Money movement |
| `risk_signals` | txn_id, layer, code, weight, detail | Every signal emitted (explainability) |
| `decisions` | txn_id, score, state, reason, intervened, resolved | Audit log of the risk firewall |

`risk_signals` + `decisions` give a complete, queryable **audit trail** — critical for compliance buyers (BNM / AML).

---

## 6. Build Phases

**Phase 0 — Foundation.** Schema + migrations, Zod transaction schema, seed script with synthetic users + a labeled mix of legit and scam transactions (`npm run db:seed`).

**Phase 1 — Deterministic core.** Layer 1 baseline scorer + Layer 2 rule set + fusion + state machine. Pure functions, fully unit-tested. *This alone is a working demo.*

**Phase 2 — AI adjudicator.** Kimi integration for the mid-band, with structured prompt + JSON-schema response (Zod-parsed). Hard timeout + deterministic fallback if LLM unavailable.

**Phase 3 — UI.** eWallet transfer screen + live "risk firewall" interception modal (shows state, score, plain-language reason) + an **ops dashboard** (decision feed, signal breakdown, KPI tiles).

**Phase 4 — Demo polish.** Scripted scam scenario for live demo, KPI summary (fraud caught, false-positive rate), architecture slide, README.

---

## 7. Demo Script (the money shot)

1. Normal transfer to a saved payee → `PASS`, instant. (Shows no friction for good users.)
2. Salary lands, then full balance to a **brand-new payee at 2 AM** → trips `QUARANTINE`, cooling-off + scam warning with reason. (Shows context-aware interception.)
3. Velocity attack: 6 rapid cash-outs → `DENY` + ops queue. (Shows hard stop.)
4. Open ops dashboard → audit trail, signal breakdown, KPIs. (Shows explainability + commercial surface.)

---

## 8. Commercialization (Rubric: 30 marks)

- **Buyers:** eWallet operators (TNG, GrabPay, Boost), neobanks, BNPL providers, remittance apps.
- **Value:** Direct fraud-loss reduction + regulatory cover (BNM scam-mitigation expectations) + lower false-positive friction than static limits.
- **Pricing:** SaaS per-transaction-scored, or tiered MAU. Risk engine ships as an embeddable API + drop-in SDK.
- **Roadmap:** v1 rule + LLM hybrid → v2 trained ML model on accumulated `risk_signals` → v3 cross-institution shared mule-account intelligence (network effect moat).
- **Compliance:** Every decision is logged and explainable (no black-box denials), satisfying audit and dispute requirements.

---

## 9. Differentiation (Rubric: 30 marks)

| Existing approach | Sentinel |
|---|---|
| Static daily/amount limits | Dynamic per-transaction behavioral scoring |
| Hard allow/block | Graduated firewall states with proportional intervention |
| Black-box ML score | Layered, explainable signals + plain-language reason |
| Post-hoc fraud detection | **Proactive interception before funds leave** |
| LLM-decides-everything | LLM gated to ambiguous mid-band → fast, cheap, controllable |

---

## 10. Risks & Mitigations

- **LLM latency/cost** → deterministic layers handle the majority; LLM only mid-band; hard timeout + fallback.
- **False positives erode trust** → graduated states (challenge before block); tunable thresholds; KPI tracked live.
- **No real bank data** → realistic synthetic dataset with labeled scam scenarios for reproducible demo.
- **Scope creep** → Phase 1 deterministic core is independently demo-able; AI + dashboard are additive.

---

## 11. Definition of Done

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all green
- [ ] Seeded DB with legit + scam scenarios
- [ ] All four firewall states reachable in the live demo
- [ ] Every decision carries an explainable reason + audit row
- [ ] Ops dashboard shows KPIs (fraud caught, false-positive rate)
- [ ] Architecture diagram + pitch slides ready
