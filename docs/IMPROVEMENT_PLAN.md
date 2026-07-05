# Post-Judging Improvement Plan

Score: 402 / 520 (avg 100.5 / 130 across 4 judges). This plan converts every judge
criticism into a concrete, ordered work item. Items are ranked by marks recovered
per unit of effort against the rubric.

## Score Autopsy

| Rubric criterion | Max | Avg scored | Lost | Root cause |
|---|---|---|---|---|
| Market Adoption & Commercial Potential | 30 | 20.75 | 9.25 | No pricing, no market sizing, B2C/B2B ambiguity |
| Innovation & Differentiation | 30 | 23.75 | 6.25 | Centerpiece (cross-bank linkage) claimed but never shown in architecture |
| Technical Execution | 30 | 24.50 | 5.50 | Real pipeline exists but is undocumented; judges had to reverse-engineer `service.ts` |
| Presentation & Demonstration | 20 | 15.75 | 4.25 | Landing page is one sentence + background image |
| Problem Relevance & Impact | 20 | 15.75 | 4.25 | Cross-platform-hopping prevalence never evidenced (one judge gave 10/20) |

The two cheapest fixes (documentation + business case) recover the most marks.
Only one item requires new engineering.

---

## P1 — Ship the cross-bank linkage for real (kills the hardest question)

**Judge criticism (Rahiman):** "Neither the pitch, the documentation, nor the
architecture diagram explain how the extension would actually connect a
transaction on one bank's website to a transaction on a different bank's website.
Each transaction appears analyzed in isolation."

**What is already true but invisible:** linkage exists at the data layer. Every
screen from every bank adapter writes to one shared Supabase `transfers` table,
and the behaviour agent looks up prior history by `payee_key`
(`normalize_payee_key` in `src/lib/agents/behaviour_agent.ts`) — the normalized
recipient identity, independent of which bank page it was observed on. A payee
flagged on Maybank IS visible when the same payee appears on Hong Leong.

**What is genuinely missing:** the schema records no *bank site* per transfer
(`channel` is the constant `browser_extension`), so there is no explicit
"same recipient, different bank" signal, and nothing in the verdict surfaces
cross-bank movement to the user.

**Work items:**

1. Add `site text not null default ''` to `public.transfers` in
   `docs/supabase_schema.sql` (idempotent `alter table ... add column if not
   exists`), thread the bank site from the adapter through `ColdTransfer` →
   `build_context` → `insert_transfer_record`.
2. Extend `get_behaviour_stats` to also return
   `distinct_site_count` and `flagged_on_other_site` for the payee key.
3. New behaviour-agent signal `CROSS_BANK_REPEAT`: fires when the same
   `payee_key` was previously flagged on a *different* site. Weight it high —
   this is the product's stated differentiator.
4. Unit tests in `behaviour_agent.test.ts`: same payee flagged on site A then
   screened on site B → signal fires; same site → does not fire.
5. Demo script: stage the exact pitch scenario (flag on bank 1, re-attempt on
   bank 2, watch `CROSS_BANK_REPEAT` escalate the verdict). This becomes the
   centerpiece demo instead of the memo-keyword demo.

**Honest limitation to document, not hide:** linkage keys on recipient account.
A scam ring using a *different* mule account per bank is not linked. State this
in the architecture doc with the roadmap answer (payee-name fuzzy matching,
shared consortium blocklist as the bank-side product).

## P2 — Business case document (largest raw mark deficit)

**Judge criticisms:** "No monetization model, pricing, or market sizing anywhere
in the repo" (Christopher). "Does that change the business model from B2C
subscription to B2B licensing to banks?" (Rahiman). "No pricing model given
anywhere."

**Work item:** `docs/BUSINESS_CASE.md` containing:

1. **Two-stage model, stated plainly.** Stage 1 (now): free consumer browser
   extension — distribution, data flywheel, proof of detection quality. Stage 2
   (product): B2B licensing of the screening API to banks/e-wallets, embedded at
   the transfer-confirmation step. The extension is the wedge, not the business.
   This directly answers Rahiman's question instead of leaving it as a hole.
2. **Pricing.** B2B: per-screened-transaction API pricing with volume tiers
   (anchor against fraud-prevention vendors like Sardine/Unit21 per-check
   pricing), plus platform fee. Give concrete numbers — a wrong number beats no
   number in judging.
3. **Market sizing.** TAM: Malaysia online-scam losses (NSRC / Bukit Aman
   publish annual figures — cite the latest year, RM billions), number of
   licensed banks + e-money issuers (BNM registry). SAM: banks with retail
   internet-banking transfer flows. SOM: 2–3 mid-tier banks in year 1.
4. **Adoption path & compliance.** Pilot via BNM Fintech Regulatory Sandbox;
   alignment with BNM's Fraud Risk Management expectations and the National
   Fraud Portal direction. Judges' rubric explicitly rewards "compliance
   considerations."
5. **Answer the prevalence question with data.** Rahiman: "How often does this
   cross-platform-hopping pattern actually occur?" Research and cite: NSRC
   reports on mule-account networks spanning multiple banks, BNM statements on
   inter-bank mule chains. If hard numbers do not exist, say so and reframe:
   the same engine catches single-platform scams too (see P3) — cross-bank
   linkage is additive coverage, not the only coverage.

## P3 — Document the real detection surface (answers the "rent memo" attack)

**Judge criticism (Rahiman):** "What would happen with the same transfer if the
user used an innocuous reference like 'rent' or left it blank? Is there any
signal beyond the text fields?"

**The answer already exists in code and was never presented.** Of the eight
deterministic signals, only one reads memo text:

| Signal | Agent | Input |
|---|---|---|
| `SCAM_KEYWORD` | risk | memo/payee text (the only text signal) |
| `HIGH_ABSOLUTE_AMOUNT` | risk | amount |
| `ROUND_CASHOUT` | risk | amount pattern |
| `NEW_PAYEE` | behaviour | payee history |
| `REPEAT_FLAGGED_PAYEE` | behaviour | payee history |
| `PAYEE_AMOUNT_SPIKE` | behaviour | amount vs payee average |
| `POPULATION_OUTLIER` | anomaly | amount z-score vs population |
| `HIGH_VELOCITY` | anomaly | screening rate in time window |

**Work items:**

1. `docs/ARCHITECTURE.md`: full pipeline description (main agent fan-out →
   risk/behaviour/anomaly specialists → deterministic fusion → AI adjudicator
   with bounded ±swing → firewall state machine → Supabase persistence), with a
   diagram. Christopher said outright this doc is the difference between the
   current score and "one of the stronger technical submissions in the pool."
2. Add a test in `fusion.test.ts` (or a new scenario test) proving the coached-
   scammer case: blank memo, new payee, large round amount → verdict still
   `warn`/`block` from `NEW_PAYEE` + `HIGH_ABSOLUTE_AMOUNT` + `ROUND_CASHOUT` +
   `POPULATION_OUTLIER`. Reference this test from the docs — evidence, not claim.
3. Change the demo's flagged example from "URGENT Crypto Money" to a blank-memo
   transfer. The memo-keyword demo actively invited this criticism.

## P4 — Presentation surface

**Judge criticisms:** "The live page is still one sentence plus a background
image" (Christopher, 14/20 presentation). "Maybe can put integrations with
e-wallet/bank app instead of separate product" (Hans — answered by P2's
two-stage model).

**Work items:**

1. Landing page: what it does, how it works (architecture diagram from P3),
   live demo GIF of the warning card intercepting a transfer, supported banks,
   link to business case. One evening of work for a straight 3–5 presentation
   marks.
2. Pitch-deck ordering fix: lead with the problem evidence (P2.5 stats), demo
   the blank-memo catch (P3.3), then the cross-bank catch (P1.5), then the
   business model slide (P2.1–P2.3). Every judge question above becomes a slide
   that pre-empts it.

## Execution order

| # | Item | Effort | Marks at stake |
|---|---|---|---|
| 1 | P3.1 architecture doc + diagram | Low | Technical + Presentation |
| 2 | P2 business case doc | Low | Market Adoption (largest deficit) |
| 3 | P3.2–P3.3 blank-memo test + demo swap | Low | Technical + kills weakest-link demo |
| 4 | P1 cross-bank signal (schema + agent + tests) | Medium | Innovation + Technical |
| 5 | P4.1 landing page | Medium | Presentation |

Items 1–3 are documentation and one test: they address the majority of lost
marks without touching the pipeline. Item 4 is the only real engineering and
turns the pitch's centerpiece from a claim into a demo.
