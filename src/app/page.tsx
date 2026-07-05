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
    detail:
      "Recipient is on the scam-account blocklist — seeded by the team, grown by the AI, checked across every bank.",
  },
  {
    code: "NEW_PAYEE",
    agent: "Behaviour",
    reads: "Transfer history",
    detail: "First time you have ever paid this recipient.",
  },
  {
    code: "REPEAT_FLAGGED_PAYEE",
    agent: "Behaviour",
    reads: "Transfer history",
    detail: "This recipient was already flagged in earlier transfers — on any supported bank.",
  },
  {
    code: "PAYEE_AMOUNT_SPIKE",
    agent: "Behaviour",
    reads: "Amount pattern",
    detail: "Amount far above what you normally send this recipient.",
  },
  {
    code: "HIGH_ABSOLUTE_AMOUNT",
    agent: "Risk",
    reads: "Amount",
    detail: "Large transfer in absolute terms.",
  },
  {
    code: "ROUND_CASHOUT",
    agent: "Risk",
    reads: "Amount pattern",
    detail: "Suspiciously round cash-out figure, a classic mule pattern.",
  },
  {
    code: "POPULATION_OUTLIER",
    agent: "Anomaly",
    reads: "Statistics",
    detail: "Amount is a statistical outlier versus all screened transfers.",
  },
  {
    code: "HIGH_VELOCITY",
    agent: "Anomaly",
    reads: "Timing",
    detail: "Burst of transfers in a short window — a hallmark of coached victims.",
  },
  {
    code: "ODD_HOUR_TRANSFER",
    agent: "Risk",
    reads: "Timing",
    detail: "Transfer initiated in the late-night window scammers favour, when help is asleep.",
  },
  {
    code: "SCAM_KEYWORD",
    agent: "Risk",
    reads: "Text",
    detail: "Scam vocabulary in the reference or payee name — the only text-based signal.",
  },
];

const pricing_tiers = [
  {
    name: "Free",
    price: "RM0",
    period: "forever",
    tagline: "Core protection for one bank.",
    highlighted: false,
    features: [
      "1 supported bank",
      "Deterministic rule screening",
      "Warning overlay before you send",
      "Scam keyword vocabulary",
    ],
    cta: "Start free",
  },
  {
    name: "Plus",
    price: "RM9",
    period: "/month",
    tagline: "The full multi-agent shield.",
    highlighted: true,
    features: [
      "All supported banks",
      "Full multi-agent AI screening",
      "Cross-bank payee memory",
      "Velocity & odd-hour signals",
      "Explainable verdict card",
    ],
    cta: "Subscribe to Plus",
  },
  {
    name: "Family",
    price: "RM19",
    period: "/month",
    tagline: "Protect the people scammers target most.",
    highlighted: false,
    features: [
      "Everything in Plus",
      "Up to 5 family profiles",
      "Age-aware protection mode",
      "Family alert on high-risk warnings",
    ],
    cta: "Protect my family",
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
    detail: "Click “Load unpacked”, select the extension/ folder, then try the Demo Bank.",
  },
];

function HeroWarningCard() {
  return (
    <div className="relative">
      <div className="absolute -right-8 -top-12 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-8 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-bold text-slate-900">High-risk transfer blocked</p>
            <p className="text-sm text-slate-500">Sentinel screened this before it was sent</p>
          </div>
          <span className="ml-auto rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
            82 / 100
          </span>
        </div>
        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Recipient</dt>
            <dd className="font-semibold text-slate-900">MULE HOLDINGS 8829</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-semibold text-slate-900">MYR 4,900.00</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Reference</dt>
            <dd className="font-semibold text-slate-900">(blank)</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">NEW_PAYEE</span>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">ROUND_CASHOUT</span>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">POPULATION_OUTLIER</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-700">
          First-ever transfer to this recipient, at an amount far outside your normal pattern.
          Scammers coach victims to leave the reference blank — Sentinel does not need it.
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                <Zap className="h-4 w-4" aria-hidden />
                Screens the transfer before the money moves
              </div>
              <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                The last checkpoint between you and a scammer
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-700">
                Sentinel reads the transfer on your bank&apos;s own page, runs it through a
                multi-agent AI risk engine, and warns you the instant something looks wrong — before
                you press Send.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="#pricing"
                  className="group inline-flex items-center gap-2 rounded-full bg-orange-600 px-7 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-700"
                >
                  Get protected free
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
                <Link
                  href="/demo-bank"
                  className="rounded-full border border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  Try the live demo
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  Never freezes your account
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  No bank integration needed
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  Works in your browser
                </span>
              </div>
            </div>
            <HeroWarningCard />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">3 + 1</p>
              <p className="mt-1 text-sm text-slate-600">specialist agents + AI adjudicator</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">10</p>
              <p className="mt-1 text-sm text-slate-600">independent risk signals</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">±25 pts</p>
              <p className="mt-1 text-sm text-slate-600">bounded AI influence on the score</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">0</p>
              <p className="mt-1 text-sm text-slate-600">accounts frozen — we warn, never lock</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Three steps, zero bank paperwork
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Everything happens in your browser, on the bank page you already use.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white">
                <Eye className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">Intercept</h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                The extension watches the transfer form on a supported bank page and catches the
                Send click before it submits — no bank integration required.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white">
                <Brain className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">Screen</h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                The payee, amount, and reference are screened by three specialist agents and an AI
                adjudicator that fuses every signal into one explainable verdict.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white">
                <AlertTriangle className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">Warn</h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                A clear card explains exactly why the transfer looks risky, so you can cancel with
                confidence — or proceed. The choice always stays yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo video */}
      {existsSync(join(process.cwd(), "public", "demo.mp4")) && (
        <section id="demo-video" className="scroll-mt-20 bg-slate-50/50">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Watch Sentinel catch a scam
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                The extension intercepting a real transfer attempt, end to end.
              </p>
            </div>
            <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <video controls playsInline preload="metadata" className="w-full">
                <source src="/demo.mp4" type="video/mp4" />
                Your browser does not support embedded video.
              </video>
            </div>
          </div>
        </section>
      )}

      {/* Architecture */}
      <section id="architecture" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Not a keyword filter — a risk engine
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Only one of the ten deterministic signals reads text. Coach a victim to type “rent”
                in the reference — Sentinel still sees everything else.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <Network className="h-6 w-6 text-orange-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-900">Main agent fans out</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Risk, Behaviour, and Anomaly specialists screen in parallel.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <Activity className="h-6 w-6 text-orange-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-900">Deterministic fusion</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Every signal is weighted into a reproducible 0–100 risk score.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <Brain className="h-6 w-6 text-orange-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-900">AI adjudication</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    An LLM rules on the evidence and can move the result a bounded ±25 points.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <Database className="h-6 w-6 text-orange-600" aria-hidden />
                  <h3 className="mt-3 font-semibold text-slate-900">Memory across banks</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Verdicts and a shared scam-account blocklist persist across banks.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Every deterministic risk signal and what it reads</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Signal
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Agent
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Reads
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detection_signals.map((signal) => (
                    <tr key={signal.code} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-orange-700">
                        {signal.code}
                      </td>
                      <td className="px-5 py-3 text-slate-700">{signal.agent}</td>
                      <td className="px-5 py-3 text-slate-700">{signal.reads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <Clock className="h-6 w-6 text-orange-600" aria-hidden />
              <h3 className="mt-4 font-semibold text-slate-900">Time-aware screening</h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                Every transfer is timestamped at observation and the late-night window scammers
                favour adds weight. A large payment to a brand-new recipient at 2 a.m. scores higher
                than the same payment at noon.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <Users className="h-6 w-6 text-orange-600" aria-hidden />
              <h3 className="mt-4 font-semibold text-slate-900">Age-aware protection</h3>
              <p className="mt-2 leading-relaxed text-slate-600">
                Your Sentinel account stores your birth year — collected once, used only to
                calibrate protection thresholds for the demographics scammers target hardest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Protection that costs less than one scam
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Malaysians reported over RM1.2 billion in scam losses in a single year. Sentinel
              starts at RM0.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {pricing_tiers.map((tier) => (
              <div
                key={tier.name}
                className={
                  tier.highlighted
                    ? "relative rounded-2xl border-2 border-orange-600 bg-white p-8 shadow-sm md:scale-105"
                    : "relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                }
              >
                {tier.highlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{tier.tagline}</p>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-slate-900">{tier.price}</span>
                  <span className="ml-1 text-slate-500">{tier.period}</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="#install"
                  className={
                    tier.highlighted
                      ? "mt-8 block rounded-full bg-orange-600 px-5 py-3 text-center font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-700"
                      : "mt-8 block rounded-full border border-slate-200 bg-white px-5 py-3 text-center font-semibold text-slate-700 transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-slate-500">
            Hackathon build: subscribing installs the extension in Chrome developer mode — no payment
            is collected.
          </p>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="scroll-mt-20 bg-orange-600">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Installed in under two minutes
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-orange-100">
              The hackathon build ships as an unpacked Chrome extension. Four steps and the shield is
              live on every supported bank page.
            </p>
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {install_steps.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl bg-white/10 p-6 backdrop-blur">
                <span className="text-sm font-bold text-orange-200">0{index + 1}</span>
                <step.icon className="mt-4 h-8 w-8 text-white" aria-hidden />
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-orange-100">{step.detail}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link
              href="/demo-bank"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-orange-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Watch it catch a scam on the Demo Bank
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
