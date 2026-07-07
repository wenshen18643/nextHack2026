# Sentinel Scam Shield — Business Case

B2C-first: a freemium consumer browser extension sold directly to the people
losing the money. This document gives the market evidence, pricing, sizing,
unit economics, adoption path, and compliance posture the product ships with.

## 1. The problem, evidenced

Malaysia's online-scam losses are large, growing, and officially documented:

| Fact | Figure | Source |
|---|---|---|
| Online fraud losses, 2025 | **RM2.97 billion** (up from RM1.57 billion in 2024) | Home Ministry, via [Malay Mail](https://www.malaymail.com/amp/news/malaysia/2026/06/24/online-scam-losses-surge-to-rm297b-in-2025-says-home-ministry-as-fraud-trend-worsens-across-malaysia/225000) |
| Cumulative losses 2023–2025 | **RM5.62 billion** | [MCPF / Home Ministry](https://www.mcpfpg.org/home-ministry-malaysias-online-fraud-surge-drains-rm2-77b-in-2025-the-highest-in-three-years/) |
| Online crime cases, Jan–Nov 2025 | **67,735 cases** | PDRM, via [Malay Mail](https://www.malaymail.com/news/malaysia/2025/12/08/malaysians-swindled-out-of-rm27b-in-cyber-scams-in-just-11-months-police-data-reveals/201156) |
| Largest loss category | Non-existent investments, **RM1.37 billion** | PDRM, via [Malay Mail](https://www.malaymail.com/news/malaysia/2025/12/08/malaysians-swindled-out-of-rm27b-in-cyber-scams-in-just-11-months-police-data-reveals/201156) |
| Mule accounts blocked by NSRC, 2025 | **162,642 accounts** | NSRC, via [Fintech News Malaysia](https://fintechnews.my/57531/cyber-security/malaysians-lost-rm2-8-billion-to-scams-in-2025-is-bnms-response-matching-the-crisis/) |
| Funds returned to victims since NSRC's 2022 founding | **RM10.9 million** | NSRC, via [Scoop](https://www.scoop.my/news/292429/online-scam-losses-hit-rm2-97-billion-in-2025-home-ministry/) |

Two of these facts define the product:

**Recovery does not work; prevention has to.** Against RM5.62 billion lost over
three years, the national recovery mechanism has returned RM10.9 million —
under 0.2%. Once the money moves, it is gone. The only economically meaningful
intervention is *before* the victim presses Send — exactly where Sentinel sits.

**The victim presses the button.** Bank Negara Malaysia has stated that most
online fraud losses are driven by [victims' own authorized
transactions](https://www.thevibes.com/articles/news/121500/most-online-fraud-losses-in-malaysia-driven-by-victims-own-transactions-bnm-reveals)
— authorized push payment scams, not stolen credentials. Bank-side controls
(2FA, device binding) do not stop a transfer the customer authorizes. A
last-checkpoint warning on the customer's own screen does.

## 2. Prevalence of multi-account and cross-platform mule flows

Judges asked how often scams actually hop platforms. The direct evidence:
NSRC blocked **162,642 mule accounts in 2025 alone**, and BNM's National Fraud
Portal was built specifically because stolen funds are layered through chains
of mule accounts across institutions — its headline capability is tracing
funds across banks [within 30 minutes](https://fintechnews.my/46575/big-data/national-fraud-portal-trace-funds/),
and it reports a [65% rise in mule-account detection](https://fintechnews.my/46575/big-data/national-fraud-portal-trace-funds/)
from cross-institution data sharing.

Honest framing: no public statistic isolates "victim moved from bank A's
website to bank B's website mid-scam." We do not claim one. The engine does not
depend on it either: nine of Sentinel's ten deterministic signals fire on a
single-platform transfer (see `docs/ARCHITECTURE.md`), and the shared
blocklist plus cross-bank payee memory are *additive* coverage that no
single-bank control can replicate — the same structural gap the National Fraud
Portal addresses on the interbank side, addressed on the customer's screen.

## 3. Product and pricing (B2C)

Freemium subscription, priced against the cost of one mistake:

| Tier | Price | What it buys |
|---|---|---|
| **Free** | RM0 | Core rule screening, one bank, warning overlay |
| **Plus** | RM9/month | All supported banks, full multi-agent AI screening, cross-bank payee memory, velocity and odd-hour signals |
| **Family** | RM19/month | Plus, for up to 5 profiles, age-aware protection mode, family alert on high-risk warnings |

The Family tier is the wedge into the highest-pain segment: scammers
systematically target older adults, and the buyer (adult child) is not the
user (parent) — a classic guardianship purchase with low churn.

Current build: no payment gateway; subscribing routes to the extension install
flow. Pricing is live on the landing page.

## 4. Market sizing

Assumptions are stated so the math can be checked:

- **TAM.** RM2.97 billion in annual scam losses is the pain budget. As a
  subscription market: Malaysia has roughly 20+ million adult online-banking
  users (BNM reports internet-banking penetration above 100% of population on
  a subscription basis). At full Plus pricing that is a theoretical
  RM2+ billion/year subscription ceiling — quoted only to bound the space.
- **SAM.** Desktop/browser banking users in scam-vulnerable households who can
  install a Chrome extension: assume 10% of online-banking adults ≈ 2 million
  users. At a blended RM8/month ≈ **RM190 million/year**.
- **SOM (year 1).** 20,000 installs via NSRC-adjacent publicity, personal
  finance media, and family word-of-mouth; 10% paid conversion at blended
  RM11/month ≈ **RM264,000 ARR**. Small, honest, and enough to prove
  detection quality and retention for the next stage.

## 5. Unit economics

- Average loss per reported case, 2025: RM2.97 billion ÷ 67,735 cases ≈
  **RM43,800**. A year of Plus costs RM108 — a 400:1 payoff if it prevents a
  single median incident.
- Marginal cost per screen is one LLM adjudication call (fractions of a sen on
  current DeepSeek-class pricing) plus negligible Postgres reads; the
  deterministic path costs effectively nothing and runs even when the AI is
  down. Gross margin at Plus pricing is software-typical (>85%) at any
  realistic screening volume.

## 6. Adoption path and compliance

1. **Now — free tier.** Prove detection quality with early users; grow
   the shared blocklist and cross-bank payee memory (the data moat).
2. **Next — paid tiers + Family mode.** Convert through the age-aware
   protection story; partner with consumer bodies and senior-citizen
   organizations for distribution.
3. **Later — institutional alignment.** The blocklist and screening engine
   align with the National Fraud Portal direction (BNM + PayNet + banks,
   [TNG eWallet already onboard](https://fintechnews.my/46575/big-data/national-fraud-portal-trace-funds/));
   Sentinel's consumer-side data is complementary, not competing.

**PDPA.** Sentinel collects one demographic field (birth year), with purpose
stated at the point of collection, used solely to calibrate protection
thresholds. Transfer screening stores payee, amount, memo, and verdict — no
bank credentials, no account numbers of the sender, no session data. All
tables are RLS-locked to the server role. Data subject deletion is a single
cascade from the auth user.

**BNM Fraud Risk Management alignment.** Sentinel warns and explains; it never
blocks a payment rail, never holds funds, and never automates a financial
decision — the user always decides. This keeps the product outside licensed
payment activity while directly supporting the regulator's stated push toward
pre-transaction fraud friction.

## Appendix — B2B path

The same screening engine embedded at a bank's transfer-confirmation step
(server-side API, per-screened-transaction pricing with volume tiers) is the
larger long-term business: banks gain full account history and device signals,
and the consumer extension's blocklist becomes a consortium feed. Deliberately
out of current messaging; revisit after the B2C detection track record exists.
