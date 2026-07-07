import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  Chrome,
  Clock,
  Database,
  Eye,
  FolderOpen,
  Network,
  ShieldCheck,
  ToggleRight,
  Users,
  Zap,
} from "lucide-react";

const detection_signals = [
  {
    code: "KNOWN_FLAGGED_ACCOUNT",
    agent: "Behaviour",
    reads: "Shared blocklist",
  },
  {
    code: "NEW_PAYEE",
    agent: "Behaviour",
    reads: "Transfer history",
  },
  {
    code: "REPEAT_FLAGGED_PAYEE",
    agent: "Behaviour",
    reads: "Transfer history",
  },
  {
    code: "PAYEE_AMOUNT_SPIKE",
    agent: "Behaviour",
    reads: "Amount pattern",
  },
  {
    code: "HIGH_ABSOLUTE_AMOUNT",
    agent: "Risk",
    reads: "Amount",
  },
  {
    code: "ROUND_CASHOUT",
    agent: "Risk",
    reads: "Amount pattern",
  },
  {
    code: "POPULATION_OUTLIER",
    agent: "Anomaly",
    reads: "Statistics",
  },
  {
    code: "HIGH_VELOCITY",
    agent: "Anomaly",
    reads: "Timing",
  },
  {
    code: "ODD_HOUR_TRANSFER",
    agent: "Risk",
    reads: "Timing",
  },
  {
    code: "SCAM_KEYWORD",
    agent: "Risk",
    reads: "Text",
  },
];

const pricing_tiers = [
  {
    name: "Pro",
    price: "RM9.90",
    period: "/month",
    tagline: "The full multi-agent shield.",
    highlighted: true,
    features: [
      "All supported banks",
      "Full multi-agent AI screening",
      "Cross-bank payee memory",
      "Shared scam-account blocklist",
      "Velocity & odd-hour signals",
      "Explainable verdict card",
    ],
    cta: "Upgrade in the extension",
    href: "#install",
  },
  {
    name: "Enterprise",
    price: "Contact us",
    period: "",
    tagline: "The same engine inside your bank's transfer flow.",
    highlighted: false,
    features: [
      "Server-side screening API",
      "Shared blocklist feed",
      "Per-screened-transaction pricing",
      "Volume tiers & SLA",
    ],
    cta: "Contact us",
    href: "mailto:wenshen18643@gmail.com?subject=Sentinel%20Enterprise",
  },
];

const install_steps = [
  {
    icon: FolderOpen,
    title: "Get the extension folder",
    detail: "Clone or download this repository — the extension lives in the extension/ folder.",
  },
  {
    icon: Chrome,
    title: "Open chrome://extensions",
    detail: "Paste chrome://extensions into Chrome's address bar and press Enter.",
  },
  {
    icon: ToggleRight,
    title: "Enable Developer mode",
    detail: "Flip the Developer mode toggle in the top-right corner of the page.",
  },
  {
    icon: ShieldCheck,
    title: "Load unpacked → extension/",
    detail: "Click “Load unpacked”, select the extension/ folder, then visit your bank.",
  },
];

function HeroWarningCard() {
  return (
    <div className="relative">
      <div className="absolute -right-12 -top-12 h-72 w-72 rounded-full bg-flame/10 blur-[100px]" />
      <div className="relative overflow-hidden rounded-3xl border border-ink-lighter bg-void-lift p-7 shadow-2xl shadow-black/40">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame/40 to-transparent" />
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-milk">High-risk transfer blocked</p>
            <p className="text-sm text-milk-muted">Sentinel screened this before it was sent</p>
          </div>
          <span className="ml-auto rounded-full bg-danger/10 px-3.5 py-1 text-sm font-bold text-danger">
            82 / 100
          </span>
        </div>
        <dl className="mt-5 space-y-2 rounded-2xl bg-void-soft p-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-milk-faint">Recipient</dt>
            <dd className="font-medium text-milk">MULE HOLDINGS 8829</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-milk-faint">Amount</dt>
            <dd className="font-medium text-milk">MYR 4,900.00</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-milk-faint">Reference</dt>
            <dd className="font-medium text-milk">(blank)</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-flame-faint px-3 py-1.5 text-flame">NEW_PAYEE</span>
          <span className="rounded-full bg-flame-faint px-3 py-1.5 text-flame">ROUND_CASHOUT</span>
          <span className="rounded-full bg-flame-faint px-3 py-1.5 text-flame">POPULATION_OUTLIER</span>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-milk-dim">
          First-ever transfer to this recipient, at an amount far outside your normal pattern.
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.15),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-ink-lighter bg-void-lift px-4 py-1.5 text-sm font-medium text-milk-muted">
                <Zap className="h-4 w-4 text-flame" aria-hidden />
                Screens the transfer before the money moves
              </div>
              <h1 className="mt-7 text-5xl font-extrabold leading-[1.05] tracking-tight text-milk sm:text-6xl lg:text-7xl">
                The last checkpoint between you and a scammer
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-milk-dim">
                Sentinel reads the transfer on your bank&apos;s own page, runs it through a
                multi-agent AI risk engine, and warns you before you press Send.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="#pricing"
                  className="group inline-flex items-center gap-2 rounded-full bg-flame px-8 py-4 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-flame-deep"
                >
                  Get protected now
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-milk-muted">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  Never freezes your account
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  No bank integration
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  Works in your browser
                </span>
              </div>
            </div>
            <HeroWarningCard />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-ink-light/50 bg-void-soft">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-milk">3 + 1</p>
              <p className="mt-1 text-sm text-milk-muted">specialist agents + AI adjudicator</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-milk">10</p>
              <p className="mt-1 text-sm text-milk-muted">independent risk signals</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-milk">±25 pts</p>
              <p className="mt-1 text-sm text-milk-muted">bounded AI influence on score</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-milk">0</p>
              <p className="mt-1 text-sm text-milk-muted">accounts frozen — we warn, never lock</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
                Three steps.
                <br />
                Zero bank paperwork.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-milk-muted">
                Everything happens in your browser, on the bank page you already use.
              </p>
            </div>
            <div className="space-y-10">
              <div className="group flex gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-lighter bg-void-lift transition-colors group-hover:border-flame/30">
                  <Eye className="h-6 w-6 text-flame" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-milk-faint">01</p>
                  <h3 className="mt-1 text-xl font-semibold text-milk">Intercept</h3>
                  <p className="mt-2 leading-relaxed text-milk-muted">
                    Catches the Send click before it submits — no bank integration required.
                  </p>
                </div>
              </div>
              <div className="group flex gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-lighter bg-void-lift transition-colors group-hover:border-flame/30">
                  <Brain className="h-6 w-6 text-flame" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-milk-faint">02</p>
                  <h3 className="mt-1 text-xl font-semibold text-milk">Screen</h3>
                  <p className="mt-2 leading-relaxed text-milk-muted">
                    Three specialist agents and an AI adjudicator fuse every signal into one
                    explainable verdict.
                  </p>
                </div>
              </div>
              <div className="group flex gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-lighter bg-void-lift transition-colors group-hover:border-flame/30">
                  <AlertTriangle className="h-6 w-6 text-flame" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-milk-faint">03</p>
                  <h3 className="mt-1 text-xl font-semibold text-milk">Warn</h3>
                  <p className="mt-2 leading-relaxed text-milk-muted">
                    A clear card explains exactly why the transfer looks risky. Cancel or proceed —
                    the choice is always yours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo video */}
      {existsSync(join(process.cwd(), "public", "demo.mp4")) && (
        <section id="demo-video" className="scroll-mt-20 bg-void-soft">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-milk sm:text-5xl">
                Watch Sentinel catch a scam
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-milk-muted">
                The extension intercepting a real transfer attempt, end to end.
              </p>
            </div>
            <div className="mt-14 overflow-hidden rounded-3xl border border-ink-lighter bg-void-lift shadow-2xl shadow-black/40">
              <video controls playsInline preload="metadata" className="w-full">
                <source src="/demo.mp4" type="video/mp4" />
                Your browser does not support embedded video.
              </video>
            </div>
          </div>
        </section>
      )}

      {/* Architecture */}
      <section id="architecture" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
              Not a keyword filter.
              <br />
              A risk engine.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-milk-muted">
              Only one of the ten deterministic signals reads text. Coach a victim to type “rent” in
              the reference — Sentinel still sees everything else.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-ink-lighter bg-void-lift p-6 transition-colors hover:border-milk-faint">
              <Network className="h-6 w-6 text-flame" aria-hidden />
              <h3 className="mt-5 font-semibold text-milk">Main agent fans out</h3>
              <p className="mt-2 text-sm leading-relaxed text-milk-muted">
                Risk, Behaviour, and Anomaly specialists screen in parallel.
              </p>
            </div>
            <div className="rounded-3xl border border-ink-lighter bg-void-lift p-6 transition-colors hover:border-milk-faint">
              <Activity className="h-6 w-6 text-flame" aria-hidden />
              <h3 className="mt-5 font-semibold text-milk">Deterministic fusion</h3>
              <p className="mt-2 text-sm leading-relaxed text-milk-muted">
                Every signal is weighted into a reproducible 0–100 risk score.
              </p>
            </div>
            <div className="rounded-3xl border border-ink-lighter bg-void-lift p-6 transition-colors hover:border-milk-faint">
              <Brain className="h-6 w-6 text-flame" aria-hidden />
              <h3 className="mt-5 font-semibold text-milk">AI adjudication</h3>
              <p className="mt-2 text-sm leading-relaxed text-milk-muted">
                An LLM rules on the evidence and can move the result a bounded ±25 points.
              </p>
            </div>
            <div className="rounded-3xl border border-ink-lighter bg-void-lift p-6 transition-colors hover:border-milk-faint">
              <Database className="h-6 w-6 text-flame" aria-hidden />
              <h3 className="mt-5 font-semibold text-milk">Memory across banks</h3>
              <p className="mt-2 text-sm leading-relaxed text-milk-muted">
                Verdicts and a shared scam-account blocklist persist across banks.
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-ink-lighter bg-void-lift">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Every deterministic risk signal and what it reads</caption>
              <thead>
                <tr className="border-b border-ink-lighter text-xs uppercase tracking-wide text-milk-faint">
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Signal
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Agent
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Reads
                  </th>
                </tr>
              </thead>
              <tbody>
                {detection_signals.map((signal) => (
                  <tr key={signal.code} className="border-b border-ink-light/50 last:border-0">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-flame">
                      {signal.code}
                    </td>
                    <td className="px-6 py-4 text-milk-dim">{signal.agent}</td>
                    <td className="px-6 py-4 text-milk-dim">{signal.reads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
              <Clock className="h-6 w-6 text-flame" aria-hidden />
              <h3 className="mt-5 font-semibold text-milk">Time-aware screening</h3>
              <p className="mt-2 leading-relaxed text-milk-muted">
                The late-night window scammers favour adds weight. A large payment to a brand-new
                recipient at 2 a.m. scores higher than the same payment at noon.
              </p>
            </div>
            <div className="rounded-3xl border border-ink-lighter bg-void-lift p-7">
              <Users className="h-6 w-6 text-flame" aria-hidden />
              <h3 className="mt-5 font-semibold text-milk">Age-aware protection</h3>
              <p className="mt-2 leading-relaxed text-milk-muted">
                Birth year is collected once and used only to calibrate thresholds for the
                demographics scammers target hardest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-void-soft">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-milk sm:text-5xl">
              Protection that costs less than one scam
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-milk-muted">
              Malaysians reported over RM1.2 billion in scam losses in a single year. Sentinel Pro
              costs RM9.90 a month.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
            {pricing_tiers.map((tier) => (
              <div
                key={tier.name}
                className={
                  tier.highlighted
                    ? "relative rounded-3xl border border-flame/50 bg-void-lift p-8 shadow-2xl shadow-black/40 md:scale-105"
                    : "relative rounded-3xl border border-ink-lighter bg-void-lift p-8 transition-colors hover:border-milk-faint"
                }
              >
                {tier.highlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-flame px-4 py-1 text-xs font-bold text-white">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-milk">{tier.name}</h3>
                <p className="mt-1 text-sm text-milk-muted">{tier.tagline}</p>
                <p className="mt-6">
                  <span className="text-5xl font-extrabold tracking-tight text-milk">
                    {tier.price}
                  </span>
                  {tier.period ? <span className="ml-1 text-milk-muted">{tier.period}</span> : null}
                </p>
                <ul className="mt-8 space-y-4 text-sm text-milk-dim">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={
                    tier.highlighted
                      ? "mt-8 block rounded-full bg-flame px-5 py-3.5 text-center font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-flame-deep"
                      : "mt-8 block rounded-full border border-ink-lighter bg-void-soft px-5 py-3.5 text-center font-semibold text-milk transition-all duration-200 hover:border-milk-faint hover:bg-void-hover"
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-sm text-milk-faint">
            Pro checkout runs live through Stripe inside the extension popup — sign in, upgrade,
            done.
          </p>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-milk sm:text-5xl">
                Installed in under two minutes.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-milk-muted">
                The hackathon build ships as an unpacked Chrome extension. Four steps and the shield
                is live on every supported bank page.
              </p>
            </div>
            <div className="grid gap-6">
              {install_steps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-5 rounded-2xl border border-ink-lighter bg-void-lift p-5 transition-colors hover:border-milk-faint"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-void-soft text-sm font-bold text-milk-faint">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-milk">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-milk-muted">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
