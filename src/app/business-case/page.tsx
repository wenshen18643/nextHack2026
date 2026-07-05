import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingUp, ShieldAlert, Users, Landmark, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Business Case — Sentinel Scam Shield",
  description:
    "Market evidence, pricing, sizing, unit economics, adoption path, and compliance posture for Sentinel Scam Shield.",
};

const headline_stats = [
  { value: "RM2.97B", label: "online fraud losses in Malaysia, 2025" },
  { value: "67,735", label: "online crime cases, Jan–Nov 2025" },
  { value: "<0.2%", label: "funds recovered by the national mechanism" },
  { value: "RM108", label: "cost of one year of Plus protection" },
];

const loss_facts = [
  {
    fact: "Online fraud losses, 2025",
    figure: "RM2.97 billion",
    source: "Home Ministry, via Malay Mail",
    href: "https://www.malaymail.com/amp/news/malaysia/2026/06/24/online-scam-losses-surge-to-rm297b-in-2025-says-home-ministry-as-fraud-trend-worsens-across-malaysia/225000",
  },
  {
    fact: "Cumulative losses 2023–2025",
    figure: "RM5.62 billion",
    source: "MCPF / Home Ministry",
    href: "https://www.mcpfpg.org/home-ministry-malaysias-online-fraud-surge-drains-rm2-77b-in-2025-the-highest-in-three-years/",
  },
  {
    fact: "Online crime cases, Jan–Nov 2025",
    figure: "67,735 cases",
    source: "PDRM, via Malay Mail",
    href: "https://www.malaymail.com/news/malaysia/2025/12/08/malaysians-swindled-out-of-rm27b-in-cyber-scams-in-just-11-months-police-data-reveals/201156",
  },
  {
    fact: "Largest loss category",
    figure: "Non-existent investments, RM1.37 billion",
    source: "PDRM, via Malay Mail",
    href: "https://www.malaymail.com/news/malaysia/2025/12/08/malaysians-swindled-out-of-rm27b-in-cyber-scams-in-just-11-months-police-data-reveals/201156",
  },
  {
    fact: "Mule accounts blocked by NSRC, 2025",
    figure: "162,642 accounts",
    source: "NSRC, via Fintech News Malaysia",
    href: "https://fintechnews.my/57531/cyber-security/malaysians-lost-rm2-8-billion-to-scams-in-2025-is-bnms-response-matching-the-crisis/",
  },
  {
    fact: "Funds returned to victims since NSRC's 2022 founding",
    figure: "RM10.9 million",
    source: "NSRC, via Scoop",
    href: "https://www.scoop.my/news/292429/online-scam-losses-hit-rm2-97-billion-in-2025-home-ministry/",
  },
];

const pricing_tiers = [
  {
    name: "Free",
    price: "RM0",
    detail: "Core rule screening, one bank, warning overlay.",
  },
  {
    name: "Plus",
    price: "RM9/month",
    detail:
      "All supported banks, full multi-agent AI screening, cross-bank payee memory, velocity and odd-hour signals.",
  },
  {
    name: "Family",
    price: "RM19/month",
    detail: "Plus for up to 5 profiles, age-aware protection mode, family alert on high-risk warnings.",
  },
];

const market_sizes = [
  {
    label: "TAM",
    figure: "RM2+ billion/year",
    detail:
      "Malaysia has roughly 20+ million adult online-banking users. At full Plus pricing, the theoretical subscription ceiling bounds the space.",
  },
  {
    label: "SAM",
    figure: "~RM190 million/year",
    detail:
      "Desktop/browser banking users in scam-vulnerable households who can install a Chrome extension: ~2 million users at a blended RM8/month.",
  },
  {
    label: "SOM (year 1)",
    figure: "~RM264,000 ARR",
    detail:
      "20,000 installs via NSRC-adjacent publicity, personal finance media, and family word-of-mouth; 10% paid conversion at blended RM11/month.",
  },
];

const adoption_steps = [
  {
    phase: "Now",
    title: "Free tier + demo bank",
    detail:
      "Prove detection quality in public; grow the shared blocklist and cross-bank payee memory — the data moat.",
  },
  {
    phase: "Next",
    title: "Paid tiers + Family mode",
    detail:
      "Convert through the age-aware protection story; partner with consumer bodies and senior-citizen organizations for distribution.",
  },
  {
    phase: "Later",
    title: "Institutional alignment",
    detail:
      "The blocklist and screening engine align with the National Fraud Portal direction; Sentinel's consumer-side data is complementary, not competing.",
  },
];

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-orange-700 underline decoration-orange-300 underline-offset-2 transition-colors hover:text-orange-600"
    >
      {children}
    </a>
  );
}

export default function BusinessCasePage() {
  return (
    <article className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Sentinel
          </Link>
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            The business case for prevention
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-700">
            Sentinel is a B2C-first freemium browser extension sold directly to the people losing
            the money. This page lays out the market evidence, pricing, sizing, unit economics,
            adoption path, and compliance posture the product ships with.
          </p>
          <dl className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
            {headline_stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <dt className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{stat.value}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Problem evidenced */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Recovery does not work; prevention has to
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Malaysia&apos;s online-scam losses are large, growing, and officially documented.
          </p>
        </div>
        <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Officially documented scam loss figures in Malaysia</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-3 font-semibold">
                  Fact
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Figure
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {loss_facts.map((row) => (
                <tr key={row.fact} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-900">{row.fact}</td>
                  <td className="px-5 py-3 font-semibold text-orange-700">{row.figure}</td>
                  <td className="px-5 py-3 text-slate-600">
                    <ExternalLink href={row.href}>{row.source}</ExternalLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <ShieldAlert className="h-6 w-6 text-red-600" aria-hidden />
            <h3 className="mt-4 font-semibold text-slate-900">Recovery is a rounding error</h3>
            <p className="mt-2 leading-relaxed text-slate-700">
              Against RM5.62 billion lost over three years, the national recovery mechanism has
              returned RM10.9 million — under 0.2%. Once the money moves, it is gone. The only
              economically meaningful intervention is before the victim presses Send.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <Users className="h-6 w-6 text-orange-600" aria-hidden />
            <h3 className="mt-4 font-semibold text-slate-900">The victim presses the button</h3>
            <p className="mt-2 leading-relaxed text-slate-700">
              Bank Negara Malaysia has stated that most online fraud losses are driven by victims&apos;
              own authorized transactions — authorized push payment scams, not stolen credentials. A
              last-checkpoint warning on the customer&apos;s own screen does what bank-side controls
              cannot.{" "}
              <ExternalLink href="https://www.thevibes.com/articles/news/121500/most-online-fraud-losses-in-malaysia-driven-by-victims-own-transactions-bnm-reveals">
                Source
              </ExternalLink>
            </p>
          </div>
        </div>
      </section>

      {/* Mule flows */}
      <section className="bg-slate-50/50 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Multi-account laundering is documented at scale
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              NSRC blocked 162,642 mule accounts in 2025 alone.
            </p>
          </div>
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="leading-relaxed text-slate-700">
              BNM&apos;s National Fraud Portal was built because stolen funds are layered through chains
              of mule accounts across institutions. Its headline capability is tracing funds across
              banks{" "}
              <ExternalLink href="https://fintechnews.my/46575/big-data/national-fraud-portal-trace-funds/">
                within 30 minutes
              </ExternalLink>
              , and it reports a{" "}
              <ExternalLink href="https://fintechnews.my/46575/big-data/national-fraud-portal-trace-funds/">
                65% rise in mule-account detection
              </ExternalLink>{" "}
              from cross-institution data sharing.
            </p>
            <p className="mt-4 leading-relaxed text-slate-700">
              Honest framing: no public statistic isolates &quot;victim moved from bank A&apos;s website to
              bank B&apos;s website mid-scam.&quot; We do not claim one. The engine does not depend on it
              either: nine of Sentinel&apos;s ten deterministic signals fire on a single-platform
              transfer, and the shared blocklist plus cross-bank payee memory are additive coverage
              that no single-bank control can replicate.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Freemium, priced against the cost of one mistake
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Current build: no payment gateway; subscribing routes to the extension install flow.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pricing_tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{tier.price}</p>
              <p className="mt-3 leading-relaxed text-slate-600">{tier.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50/50 p-6">
          <p className="leading-relaxed text-slate-800">
            <strong className="text-slate-900">Family is the wedge.</strong> Scammers systematically
            target older adults, and the buyer (adult child) is not the user (parent) — a classic
            guardianship purchase with low churn.
          </p>
        </div>
      </section>

      {/* Market sizing */}
      <section className="bg-slate-50/50 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              TAM, SAM, and an honest year-one SOM
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Assumptions are stated so the math can be checked.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {market_sizes.map((size) => (
              <div key={size.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
                  {size.label}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">{size.figure}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{size.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unit economics */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            A 400:1 payoff if it prevents a single median incident
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <TrendingUp className="h-6 w-6 text-orange-600" aria-hidden />
            <h3 className="mt-4 font-semibold text-slate-900">Average loss per reported case</h3>
            <p className="mt-2 leading-relaxed text-slate-700">
              RM2.97 billion ÷ 67,735 cases ≈ <strong className="text-slate-900">RM43,800</strong>. A
              year of Plus costs RM108 — a 400:1 payoff if it prevents a single median incident.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <Scale className="h-6 w-6 text-orange-600" aria-hidden />
            <h3 className="mt-4 font-semibold text-slate-900">Gross margin</h3>
            <p className="mt-2 leading-relaxed text-slate-700">
              Marginal cost per screen is one LLM adjudication call (fractions of a sen on current
              DeepSeek-class pricing) plus negligible Postgres reads. The deterministic path costs
              effectively nothing and runs even when the AI is down. Gross margin at Plus pricing is
              software-typical (&gt;85%) at any realistic screening volume.
            </p>
          </div>
        </div>
      </section>

      {/* Adoption path */}
      <section className="bg-slate-50/50 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Free now, paid next, aligned later
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {adoption_steps.map((step, index) => (
              <li
                key={step.phase}
                className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="text-sm font-bold text-orange-600">0{index + 1}</span>
                <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Compliance */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Aligned with regulators, not in their lane
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <Landmark className="h-6 w-6 text-orange-600" aria-hidden />
            <h3 className="mt-4 font-semibold text-slate-900">PDPA</h3>
            <p className="mt-2 leading-relaxed text-slate-700">
              Sentinel collects one demographic field (birth year), with purpose stated at the point
              of collection, used solely to calibrate protection thresholds. Transfer screening
              stores payee, amount, memo, and verdict — no bank credentials, no account numbers of
              the sender, no session data. All tables are RLS-locked to the server role. Data subject
              deletion is a single cascade from the auth user.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <Scale className="h-6 w-6 text-orange-600" aria-hidden />
            <h3 className="mt-4 font-semibold text-slate-900">BNM Fraud Risk Management</h3>
            <p className="mt-2 leading-relaxed text-slate-700">
              Sentinel warns and explains; it never blocks a payment rail, never holds funds, and
              never automates a financial decision — the user always decides. This keeps the product
              outside licensed payment activity while directly supporting the regulator&apos;s stated
              push toward pre-transaction fraud friction.
            </p>
          </div>
        </div>
      </section>

      {/* Appendix */}
      <section className="bg-slate-50/50 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Appendix — B2B path
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            The same screening engine embedded at a bank&apos;s transfer-confirmation step (server-side
            API, per-screened-transaction pricing with volume tiers) is the larger long-term
            business: banks gain full account history and device signals, and the consumer
            extension&apos;s blocklist becomes a consortium feed. Deliberately out of current messaging;
            revisit after the B2C detection track record exists.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-600 px-7 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-700"
          >
            Back to Sentinel
            <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden />
          </Link>
        </div>
      </section>
    </article>
  );
}
