# Post-Judging Improvement Plan — Remaining Work

Score: 402 / 520 (avg 100.5 / 130 across 4 judges). Completed items have been
removed; what follows is only the outstanding work, ranked by marks recovered
per unit of effort.

## Score Autopsy

| Rubric criterion | Max | Avg scored | Lost | Root cause |
|---|---|---|---|---|
| Market Adoption & Commercial Potential | 30 | 20.75 | 9.25 | No pricing, no market sizing, B2C/B2B ambiguity |
| Innovation & Differentiation | 30 | 23.75 | 6.25 | Centerpiece (cross-bank linkage) claimed but never shown in architecture |
| Technical Execution | 30 | 24.50 | 5.50 | Real pipeline exists but was undocumented |
| Presentation & Demonstration | 20 | 15.75 | 4.25 | Landing page was one sentence + background image |
| Problem Relevance & Impact | 20 | 15.75 | 4.25 | Cross-platform-hopping prevalence never evidenced (one judge gave 10/20) |

---

## P1 — Ship the cross-bank linkage for real (kills the hardest question)

**Judge criticism (Rahiman):** "Neither the pitch, the documentation, nor the
architecture diagram explain how the extension would actually connect a
transaction on one bank's website to a transaction on a different bank's website.
Each transaction appears analyzed in isolation."

**What already exists:** every bank adapter writes to one shared `transfers`
table keyed by `payee_key`, and the shared `flagged_accounts` blocklist is
checked on every screen across all banks. What is still missing is the
*explicit* cross-bank signal and the demo that stages it.

**Work items:**

1. Add `site text not null default ''` to `public.transfers` in
   `docs/supabase_schema.sql` (idempotent), thread the bank site from the
   adapter through `ColdTransfer` → `build_context` → `insert_transfer_record`.
2. Extend `get_behaviour_stats` to also return `distinct_site_count` and
   `flagged_on_other_site` for the payee key.
3. New behaviour-agent signal `CROSS_BANK_REPEAT`: fires when the same
   `payee_key` was previously flagged on a *different* site. Weight it high —
   this is the product's stated differentiator.
4. Unit tests in `behaviour_agent.test.ts`: same payee flagged on site A then
   screened on site B → signal fires; same site → does not fire.
5. Demo script: stage the exact pitch scenario (flag on bank 1, re-attempt on
   bank 2, watch `CROSS_BANK_REPEAT` escalate the verdict). This becomes the
   centerpiece demo.

## P4.2 — Pitch-deck ordering (human task)

Lead with problem evidence (the stats in `docs/BUSINESS_CASE.md` §1), demo the
blank-memo catch, then the blocklist/cross-bank catch, then the business model
slide. Every judge question becomes a slide that pre-empts it.

## Manual steps pending (user)

- Drop the demo recording at `public/demo.mp4` — the landing section
  self-reveals once the file exists.
