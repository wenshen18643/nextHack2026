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
  { value: "RM119", label: "cost of one year of Pro protection" },
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
    name: "Pro",
    price: "RM9.90/month",
    detail:
      "Everything, one price: all supported banks, full multi-agent AI screening, cross-bank payee memory, shared scam blocklist, velocity and odd-hour signals. Paid in-extension via Stripe.",
  },
  {
    name: "Enterprise",
    price: "Contact us",
    detail:
      "The same screening engine embedded at a bank's transfer-confirmation step: server-side API, shared blocklist feed, per-screened-transaction pricing with volume tiers.",
  },
];

const market_sizes = [
  {
    label: "TAM",
    figure: "RM2+ billion/year",
    detail:
      "Malaysia has roughly 20+ million adult online-banking users. At full Pro pricing, the theoretical subscription ceiling bounds the space.",
  },
  {
    label: "SAM",
    figure: "~RM238 million/year",
    detail:
      "Desktop/browser banking users in scam-vulnerable households who can install a Chrome extension: ~2 million users at RM9.90/month.",
  },
  {
    label: "SOM (year 1)",
    figure: "~RM238,000 ARR",
    detail:
      "20,000 installs via NSRC-adjacent publicity, personal finance media, and family word-of-mouth; 10% paid conversion at RM9.90/month.",
  },
];

const adoption_steps = [
  {
    phase: "Now",
    title: "Pro extension + demo bank",
    detail:
      "Prove detection quality in public; grow the shared blocklist and cross-bank payee memory — the data moat.",
  },
  {
    phase: "Next",
    title: "Pro subscriptions at scale",
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
      className="font-medium text-flame underline decoration-flame/30 underline-offset-2 transition-colors hover:text-flame-deep"
    >
      {children}
    </a>
  );
}

export default function BusinessCasePage() {
  return (
    <article className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-void-soft">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-milk-muted transition-colors hover:text-milk"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Sentinel
          </Link>
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-milk sm:text-6xl">
            The business case for prevention
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-milk-dim">
            Sentinel is a B2C-first freemium browser extension sold directly to the people losing the
            money. This page lays out the market evidence, pricing, sizing, unit economics, adoption
            path, and compliance posture the product ships with.
          </p>
          <dl className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            {headline_stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-ink-lighter bg-void-lift p-5"
              >
                <dt className="text-2xl font-extrabold tracking-tight text-milk sm:text-3xl">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-milk-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Problem evidenced */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
            Recovery does not work.
            <br />
            Prevention has to.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-milk-muted">
            Malaysia&apos;s online-scam losses are large, growing, and officially documented.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-3xl border border-ink-lighter bg-void-lift">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Officially documented scam loss figures in Malaysia</caption>
            <thead>
              <tr className="border-b border-ink-lighter text-xs uppercase tracking-wide text-milk-faint">
                <th scope="col" className="px-6 py-4 font-semibold">
                  Fact
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  Figure
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {loss_facts.map((row) => (
                <tr key={row.fact} className="border-b border-ink-light/50 last:border-0">
                  <td className="px-6 py-4 font-medium text-milk">{row.fact}</td>
                  <td className="px-6 py-4 font-semibold text-flame">{row.figure}</td>
                  <td className="px-6 py-4 text-milk-muted">
                    <ExternalLink href={row.href}>{row.source}</ExternalLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
            <ShieldAlert className="h-6 w-6 text-danger" aria-hidden />
            <h3 className="mt-5 font-semibold text-milk">Recovery is a rounding error</h3>
            <p className="mt-2 leading-relaxed text-milk-muted">
              Against RM5.62 billion lost over three years, the national recovery mechanism has
              returned RM10.9 million — under 0.2%. Once the money moves, it is gone. The only
              economically meaningful intervention is before the victim presses Send.
            </p>
          </div>
          <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
            <Users className="h-6 w-6 text-flame" aria-hidden />
            <h3 className="mt-5 font-semibold text-milk">The victim presses the button</h3>
            <p className="mt-2 leading-relaxed text-milk-muted">
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
      <section className="bg-void-soft py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
              Multi-account laundering is documented at scale
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-milk-muted">
              NSRC blocked 162,642 mule accounts in 2025 alone.
            </p>
          </div>
          <div className="mt-12 rounded-3xl border border-ink-lighter bg-void-lift p-7 md:p-10">
            <p className="leading-relaxed text-milk-dim">
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
            <p className="mt-4 leading-relaxed text-milk-dim">
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
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
            One price, set against the cost of one mistake
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-milk-muted">
            Current build: Pro checkout runs live through Stripe from the extension popup;
            Enterprise starts with a conversation.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {pricing_tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-3xl border border-ink-lighter bg-void-lift p-7 transition-colors hover:border-milk-faint"
            >
              <h3 className="text-lg font-semibold text-milk">{tier.name}</h3>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-milk">{tier.price}</p>
              <p className="mt-3 leading-relaxed text-milk-muted">{tier.detail}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-6 max-w-4xl rounded-3xl border border-flame/30 bg-flame-faint p-7">
          <p className="leading-relaxed text-milk-dim">
            <strong className="text-milk">The extension is the wedge.</strong> Every consumer
            screen grows the shared blocklist and cross-bank payee memory — the data moat an
            Enterprise bank integration buys into. Scammers systematically target older adults,
            and the buyer (adult child) is often not the user (parent) — a guardianship purchase
            with low churn.
          </p>
        </div>
      </section>

      {/* Market sizing */}
      <section className="bg-void-soft py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
              TAM, SAM, and an honest year-one SOM
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-milk-muted">
              Assumptions are stated so the math can be checked.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {market_sizes.map((size) => (
              <div
                key={size.label}
                className="rounded-3xl border border-ink-lighter bg-void-lift p-7"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-flame">
                  {size.label}
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-milk">
                  {size.figure}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-milk-muted">{size.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unit economics */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
            A 400:1 payoff if it prevents a single median incident
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
            <TrendingUp className="h-6 w-6 text-flame" aria-hidden />
            <h3 className="mt-5 font-semibold text-milk">Average loss per reported case</h3>
            <p className="mt-2 leading-relaxed text-milk-muted">
              RM2.97 billion ÷ 67,735 cases ≈ <strong className="text-milk">RM43,800</strong>. A year
              of Pro costs RM119 — a ~370:1 payoff if it prevents a single median incident.
            </p>
          </div>
          <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
            <Scale className="h-6 w-6 text-flame" aria-hidden />
            <h3 className="mt-5 font-semibold text-milk">Gross margin</h3>
            <p className="mt-2 leading-relaxed text-milk-muted">
              Marginal cost per screen is one LLM adjudication call (fractions of a sen on current
              DeepSeek-class pricing) plus negligible Postgres reads. The deterministic path costs
              effectively nothing and runs even when the AI is down. Gross margin at Pro pricing is
              software-typical (&gt;85%) at any realistic screening volume.
            </p>
          </div>
        </div>
      </section>

      {/* Adoption path */}
      <section className="bg-void-soft py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
              Free now, paid next, aligned later
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {adoption_steps.map((step, index) => (
              <li
                key={step.phase}
                className="rounded-3xl border border-ink-lighter bg-void-lift p-7"
              >
                <span className="text-sm font-bold text-flame">0{index + 1}</span>
                <h3 className="mt-3 font-semibold text-milk">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-milk-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Compliance */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
            Aligned with regulators,
            <br />
            not in their lane
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
            <Landmark className="h-6 w-6 text-flame" aria-hidden />
            <h3 className="mt-5 font-semibold text-milk">PDPA</h3>
            <p className="mt-2 leading-relaxed text-milk-muted">
              Sentinel collects one demographic field (birth year), with purpose stated at the point
              of collection, used solely to calibrate protection thresholds. Transfer screening
              stores payee, amount, memo, and verdict — no bank credentials, no account numbers of
              the sender, no session data. All tables are RLS-locked to the server role. Data subject
              deletion is a single cascade from the auth user.
            </p>
          </div>
          <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
            <Scale className="h-6 w-6 text-flame" aria-hidden />
            <h3 className="mt-5 font-semibold text-milk">BNM Fraud Risk Management</h3>
            <p className="mt-2 leading-relaxed text-milk-muted">
              Sentinel warns and explains; it never blocks a payment rail, never holds funds, and
              never automates a financial decision — the user always decides. This keeps the product
              outside licensed payment activity while directly supporting the regulator&apos;s stated
              push toward pre-transaction fraud friction.
            </p>
          </div>
        </div>
      </section>

      {/* Appendix */}
      <section className="bg-void-soft py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-extrabold tracking-tight text-milk sm:text-5xl">
            Appendix — B2B path
          </h2>
          <p className="mt-5 leading-relaxed text-milk-muted">
            The same screening engine embedded at a bank&apos;s transfer-confirmation step (server-side
            API, per-screened-transaction pricing with volume tiers) is the larger long-term
            business: banks gain full account history and device signals, and the consumer
            extension&apos;s blocklist becomes a consortium feed. Deliberately out of current messaging;
            revisit after the B2C detection track record exists.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-flame px-7 py-4 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-flame-deep"
          >
            Back to Sentinel
            <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden />
          </Link>
        </div>
      </section>
    </article>
  );
}
