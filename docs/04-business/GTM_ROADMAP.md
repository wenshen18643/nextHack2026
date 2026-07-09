# Sentinel Scam Shield — Go-To-Market Roadmap

## Executive Summary

Sentinel Scam Shield is a working MVP: a Chrome extension + Next.js multi-agent engine that warns Malaysian consumers before they send money to a likely scam. The product is already functional, billable (Stripe Pro), and backed by a BNM-alert blocklist and a user dashboard.

This roadmap treats **Working MVP + Market Research** as the foundation, adds **two deliberate intermediate milestones**, and ends with a clear **dual-revenue Goal** that serves both B2C subscribers and B2B bank/fintech customers.

---

## 1. Market Research Snapshot

### The Problem (Malaysia-focused)

| Metric | Value | Source |
|---|---|---|
| Online fraud losses (2025) | RM 2.97 billion | Malaysian Home Ministry / NSRC |
| Online crime cases (Jan–Nov 2025) | 67,735 | PDRM / NSRC |
| Cumulative losses (2023–2025) | RM 5.62 billion | BUSINESS_CASE.md |
| National recovery rate | < 0.2% | BUSINESS_CASE.md |
| Mule accounts blocked (2025) | 162,642 | NSRC |
| Largest scam category | Non-existent investments (RM 1.37 bn) | BUSINESS_CASE.md |

Recovery is almost zero, so **prevention is the only economically meaningful intervention**.

### Global Context

- Global fraud detection & prevention market: **USD 33.1B (2024) → USD 90.1B (2030)** at ~18.7% CAGR.
- Asia-Pacific is the fastest-growing region for online payment fraud losses.
- Banks and fintechs are increasing spend on real-time, AI-powered fraud controls.

### Competitive Position

| Competitor Type | Weakness Sentinel Exploits |
|---|---|
| Bank-native fraud rules | Slow to update, no cross-bank memory, no consumer-facing warning |
| Generic antivirus/ Safe Browsing | Does not read the live bank transfer form |
| Standalone AI chat checkers | Requires user to copy-paste; high friction |
| Scam reporting portals (Semak Mule) | Reactive, query-only, no real-time interception |

**Sentinel's moat:** last-second interception on the bank page, deterministic + bounded-AI fusion, cross-bank payee memory, and a growing shared blocklist.

---

## 2. The Roadmap

```
Working MVP + Market Research  →  Thing 1  →  Thing 2  →  Goal
        (Phase 0)              (Phase 1)  (Phase 2)   (Phase 3)
```

---

## Phase 0 — Foundation: Working MVP + Market Research

**Status:** Mostly built. This is the starting block.

### B2C
- Chrome MV3 extension intercepts Send clicks on 20 Malaysian bank/e-wallet domains.
- Free tier: core rules + one bank.
- Pro tier: RM 9.90/month — all banks, full multi-agent AI, blocklist, velocity, odd-hour signals.
- Stripe billing live; user dashboard tracks screened transfers.

### B2B
- Enterprise tier is concept-only on the landing page.
- No formal API contract, SLA, or bank ops dashboard yet.

### Market Research to Complete in This Phase
1. **User interviews:** 15–20 Malaysians aged 45+ and 25–35 who have sent money online.
2. **Scam taxonomy validation:** confirm which categories (investment, rental, impersonation, e-commerce) trigger the most losses.
3. **Bank coverage audit:** which banks' customers are most targeted and which markup is most stable.
4. **Willingness-to-pay test:** price sensitivity for Pro (RM 9.90 vs RM 14.90 vs family plan).
5. **Competitor teardown:** document bank OTP flows, JomPay, DuitNow fraud messages.

### Exit Criteria for Phase 0
- MVP stable on CIMB + Maybank + Hong Leong (the three most-requested banks).
- 100+ real screens completed by beta users.
- Clear ICP (ideal customer profile) documented.

---

## Phase 1 — Thing 1: B2C Product-Market Fit & Distribution

**Objective:** Prove consumers will install, use, and pay.

### B2C Actions
1. **Chrome Web Store launch**
   - Packaged, listed, and reviewed extension.
   - Store listing optimised with screenshots and video from `docs/05-demo/demo.mp4`.
2. **Bank adapter hardening**
   - Move from 2 precise adapters (CIMB, Hong Leong) to at least 6 precise adapters.
   - Add DOM-dump workflow so non-technical testers can contribute selectors.
3. **Pro conversion optimisation**
   - In-extension upsell after a warning is shown.
   - Family/guardian plan: one payer protects up to 3 family members.
4. **Trust & content engine**
   - Blog/SEO: "BNM alert list scam", "how to spot a mule account", bank-specific guides.
   - Malay-language landing page variant.
   - Partnership with Malaysian personal-finance influencers and scam-awareness NGOs.
5. **Viral loop**
   - "Protect your parents" referral: referrers get 1 free Pro month.

### B2B Preparation (Seed the Future)
- Begin logging aggregate, anonymised detection metrics by scam category.
- Publish a quarterly "Malaysia Scam Signal Report" to build thought leadership.
- Soft-list an "Enterprise waitlist" on the website.

### Phase 1 Targets (6–9 months)
| Metric | Target |
|---|---|
| Monthly active users (MAU) | 1,000 |
| Free-to-Pro conversion | 5% |
| Pro subscribers | 50 |
| ARR | ~RM 6,000 |
| Chrome Web Store rating | ≥ 4.2 |

### Exit Criteria
- Consistent week-over-week install growth.
- Pro subscribers renew after month 1.
- At least one bank reaches out via the Enterprise waitlist.

---

## Phase 2 — Thing 2: B2B Pilot & Data Moat

**Objective:** Convert consumer proof into bank/fintech revenue.

### B2B Actions
1. **Enterprise API productisation**
   - Formalise `POST /api/screen` into a documented, versioned API.
   - Add bank ops dashboard: queue of flagged transfers, analyst override, case export.
   - SLA: 99.9% uptime, < 500ms p95 latency.
2. **Pilot with 1–2 partners**
   - Target: a digital bank or large e-wallet that lacks in-house scam AI.
   - Pricing: per-screened-transaction with volume tiers, minimum monthly fee.
3. **Consortium blocklist**
   - Allow pilot banks to contribute confirmed fraud labels.
   - Federated learning approach: improve models without sharing raw customer data.
4. **Compliance packaging**
   - PDPA documentation, BNM fintech sandbox alignment, penetration-test report.
5. **B2C as data engine**
   - Use B2C screens to discover new scam patterns and validate blocklist additions.

### B2C Continuation
- Launch family plan.
- Expand to Singapore as first international market (similar scam patterns, English UI ready).
- Introduce annual Pro discount.

### Phase 2 Targets (12–18 months)
| Metric | Target |
|---|---|
| B2C MAU | 5,000 |
| Pro subscribers | 300 |
| B2C ARR | ~RM 36,000 |
| Enterprise pilots | 2–3 |
| Enterprise ARR | ~RM 60,000 |
| Total ARR | ~RM 96,000 |

### Exit Criteria
- At least one paid Enterprise contract signed.
- Detection performance report shows > 80% scam recall at < 5% false-positive rate on pilot data.
- B2C growth funds the B2B sales cycle without external capital.

---

## Phase 3 — Goal: Dual-Engine Market Leader

**Objective:** Build a self-sustaining, two-sided fraud-prevention platform.

### B2C Goal
- The consumer extension is the default scam-shield for Malaysian online banking.
- Expanded across SEA: Singapore, Philippines, Indonesia (local bank adapters + language variants).
- Revenue engine: Pro subscriptions + family plans.

### B2B Goal
- Sentinel's API is embedded at the confirmation step of 5+ banks/e-wallets.
- Consortium blocklist becomes an industry-standard feed.
- Enterprise revenue exceeds B2C revenue.

### Goal Targets (24–36 months)
| Metric | Target |
|---|---|
| B2C MAU | 50,000+ |
| Pro subscribers | 2,000+ |
| B2C ARR | ~RM 240,000+ |
| Enterprise customers | 5+ |
| Enterprise ARR | ~RM 760,000+ |
| **Total ARR** | **RM 1,000,000+** |
| Geography | Malaysia + 2 SEA markets |

---

## 3. B2B vs B2C Strategy Matrix

| Dimension | B2C | B2B |
|---|---|---|
| **Primary buyer** | Individual / family protector | Risk/compliance team at bank/e-wallet |
| **Go-to-market** | Chrome Web Store, SEO, influencers, referrals | Outbound to CROs, BNM sandbox, conferences |
| **Pricing model** | Freemium subscription | Per-transaction + platform fee |
| **Key metric** | Conversion, retention, NPS | Recall, false-positive rate, uptime |
| **Moat** | Cross-bank payee memory, blocklist | Consortium data, bank-validated models |
| **Risk** | Bank markup fragility, low willingness to pay | Long sales cycle, compliance burden |

---

## 4. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Bank websites break the extension | Invest in DOM-dump tooling; treat Enterprise API as the durable channel |
| Users ignore warnings | A/B test overlay design; add one-tap "report scam" feedback |
| False positives erode trust | Deterministic floor + bounded AI; transparent per-signal explanation |
| B2B sales cycle is too long | Start with digital banks/e-wallets, not tier-1 incumbents |
| Regulatory pushback | Stay out of payment rails; act as an advisory layer; engage BNM sandbox early |

---

## 5. Immediate Next Steps (This Week)

1. Finalise the 3-bank adapter hardening for CIMB, Maybank, and Hong Leong.
2. Create a one-page "Beta tester" sign-up form linked from the landing page.
3. Draft the first "Malaysia Scam Signal Report" using existing BNM alert-list data.
4. Open the Enterprise waitlist and capture bank/email contacts.
5. Set analytics on the dashboard to measure retention and warning-dismissal rates.

---

*Roadmap derived from codebase scan (`src/`, `extension/`, `docs/`) and market research (Grand View Research, Fortune Business Insights, Straits Research, Fintech Futures, plus Malaysian NSRC/PDRM data cited in `docs/04-business/BUSINESS_CASE.md`).*
