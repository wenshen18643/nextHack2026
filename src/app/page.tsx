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

const hero_stats = [
  { value: "3 + 1", label: "specialist agents + AI adjudicator" },
  { value: "10", label: "independent risk signals" },
  { value: "±25 pts", label: "bounded AI influence on the score" },
  { value: "0", label: "accounts frozen — we warn, never lock" },
];

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

/**
 * Section heading with an optional eyebrow line, shared across the landing
 * page for consistent rhythm.
 */
function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{title}</h2>
      {lead ? <p className="mt-4 text-lg leading-relaxed text-ink-500">{lead}</p> : null}
    </div>
  );
}

/**
 * The isometric mock of the extension's warning card shown in the hero, so
 * visitors see the product's core moment without installing anything.
 */
function HeroWarningCard() {
  return (
    <div className="relative [perspective:2000px]">
      <div className="absolute -right-10 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-brand-500 to-amber-400 opacity-25 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-400 to-brand-500 opacity-20 blur-3xl" />
      <div className="relative rounded-xl border border-brand-100 bg-white p-6 shadow-md transition-transform duration-500 [transform:rotateX(4deg)_rotateY(-10deg)] hover:[transform:rotateX(2deg)_rotateY(-6deg)]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-bold text-ink-900">High-risk transfer blocked</p>
            <p className="text-sm text-ink-500">Sentinel screened this before it was sent</p>
          </div>
          <span className="ml-auto rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
            82 / 100
          </span>
        </div>
        <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">Recipient</dt>
            <dd className="font-semibold text-ink-900">MULE HOLDINGS 8829</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Amount</dt>
            <dd className="font-semibold text-ink-900">MYR 4,900.00</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Reference</dt>
            <dd className="font-semibold text-ink-900">(blank)</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">NEW_PAYEE</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">ROUND_CASHOUT</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">POPULATION_OUTLIER</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-700">
          First-ever transfer to this recipient, at an amount far outside your normal pattern.
          Scammers coach victims to leave the reference blank — Sentinel does not need it.
        </p>
      </div>
    </div>
  );
}

/**
 * Hero: the headline promise, primary CTAs, and product-truth stats.
 */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            <Zap className="h-4 w-4" aria-hidden />
            Screens the transfer before the money moves
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
            The last checkpoint{" "}
            <span className="bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-transparent">
              between you and a scammer
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-500">
            Sentinel is a browser extension that reads the transfer on your bank&apos;s own page,
            runs it through a multi-agent AI risk engine, and warns you the instant something looks
            wrong — before you press Send. It never freezes your account and never touches your
            money.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="#pricing"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-amber-500 px-6 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Get protected free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/demo-bank"
              className="rounded-full border border-brand-200 bg-white px-6 py-3 font-semibold text-ink-700 transition-all duration-200 hover:bg-brand-50 hover:text-brand-600"
            >
              Try the live demo
            </Link>
          </div>
        </div>
        <HeroWarningCard />
      </div>
      <div className="border-t border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          {hero_stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="text-3xl font-extrabold text-ink-900">{stat.value}</dt>
              <dd className="mt-1 text-sm text-ink-500">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * How it works: the three-step user-visible flow.
 */
function HowItWorksSection() {
  const steps = [
    {
      icon: Eye,
      title: "1. Intercept",
      detail:
        "The extension watches the transfer form on a supported bank page and catches the Send click before it submits — no bank integration required.",
    },
    {
      icon: Brain,
      title: "2. Screen",
      detail:
        "The payee, amount, and reference are screened by three specialist agents and an AI adjudicator that fuses every signal into one explainable verdict.",
    },
    {
      icon: AlertTriangle,
      title: "3. Warn",
      detail:
        "A clear card explains exactly why the transfer looks risky, so you can cancel with confidence — or proceed. The choice always stays yours.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, zero bank paperwork"
          lead="Everything happens in your browser, on the bank page you already use."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <step.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-500">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const demo_video_public_path = "demo.mp4";

/**
 * Demo video: renders only when public/demo.mp4 exists, so the section appears
 * automatically once the recording is dropped in — no code change needed.
 */
function DemoVideoSection() {
  if (!existsSync(join(process.cwd(), "public", demo_video_public_path))) {
    return null;
  }
  return (
    <section id="demo-video" className="scroll-mt-20 bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="See it live"
          title="Watch Sentinel catch a scam"
          lead="The extension intercepting a real transfer attempt, end to end."
        />
        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-xl border border-brand-100 shadow-md">
          <video controls playsInline preload="metadata" className="w-full">
            <source src={`/${demo_video_public_path}`} type="video/mp4" />
            Your browser does not support embedded video — open /{demo_video_public_path} directly.
          </video>
        </div>
      </div>
    </section>
  );
}

/**
 * Architecture: the real multi-agent pipeline and the full signal surface, so
 * the technical depth of the build is visible without reading the source.
 */
function ArchitectureSection() {
  const pipeline_stages = [
    {
      icon: Network,
      title: "Main agent fans out",
      detail: "Risk, Behaviour, and Anomaly specialists screen the transfer in parallel.",
    },
    {
      icon: Activity,
      title: "Deterministic fusion",
      detail: "Every signal is weighted and fused into a reproducible 0–100 risk score.",
    },
    {
      icon: Brain,
      title: "AI adjudication",
      detail:
        "An LLM rules on the full evidence — transfer, findings, and score — and can move the result a bounded ±25 points, never more.",
    },
    {
      icon: Database,
      title: "Memory across banks",
      detail:
        "Verdicts and a shared scam-account blocklist persist across banks — and the AI can add a confirmed scam account to the blocklist the moment it blocks one.",
    },
  ];

  return (
    <section id="architecture" className="scroll-mt-20 bg-gradient-to-b from-white to-brand-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="Under the hood"
          title={
            <>
              Not a keyword filter —{" "}
              <span className="bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-transparent">
                a risk engine
              </span>
            </>
          }
          lead="Only one of the ten deterministic signals reads text. Coach a victim to type “rent” in the reference — Sentinel still sees everything else."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pipeline_stages.map((stage, index) => (
            <div
              key={stage.title}
              className="relative rounded-xl border border-brand-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-brand-600 to-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <stage.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-ink-900">{stage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{stage.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 overflow-x-auto rounded-xl border border-brand-100 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Every deterministic risk signal and what it reads</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-5 py-3 font-semibold">Signal</th>
                <th scope="col" className="px-5 py-3 font-semibold">Agent</th>
                <th scope="col" className="px-5 py-3 font-semibold">Reads</th>
                <th scope="col" className="px-5 py-3 font-semibold">What it catches</th>
              </tr>
            </thead>
            <tbody>
              {detection_signals.map((signal) => (
                <tr key={signal.code} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                    {signal.code}
                  </td>
                  <td className="px-5 py-3 text-ink-700">{signal.agent}</td>
                  <td className="px-5 py-3 text-ink-700">{signal.reads}</td>
                  <td className="px-5 py-3 text-ink-500">{signal.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Clock className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-4 font-semibold text-ink-900">Time-aware screening</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Every transfer is timestamped at observation and the ODD_HOUR_TRANSFER signal
              weights the late-night window scammers favour. A large payment to a brand-new
              recipient at 2 a.m. scores higher than the same payment at noon.
            </p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-4 font-semibold text-ink-900">Age-aware protection</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Your Sentinel account stores your birth year — collected once, used only to
              calibrate protection thresholds for the demographics scammers target hardest. The
              warning card always explains itself in behavioural terms.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * B2C pricing: three tiers, all routing to the developer-mode install flow —
 * no payment gateway in the hackathon build.
 */
function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="Pricing"
          title="Protection that costs less than one scam"
          lead="Malaysians reported over RM1.2 billion in scam losses in a single year. Sentinel starts at RM0."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pricing_tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.highlighted
                  ? "relative rounded-xl border border-brand-200 bg-white p-8 shadow-md ring-1 ring-brand-200 transition-all duration-200 hover:-translate-y-1 md:scale-105"
                  : "relative rounded-xl border border-brand-100 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              }
            >
              {tier.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-600 to-amber-500 px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-ink-900">{tier.name}</h3>
              <p className="mt-1 text-sm text-ink-500">{tier.tagline}</p>
              <p className="mt-4">
                <span className="text-4xl font-extrabold text-ink-900">{tier.price}</span>
                <span className="ml-1 text-ink-500">{tier.period}</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink-700">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="#install"
                className={
                  tier.highlighted
                    ? "mt-8 block rounded-full bg-gradient-to-r from-brand-600 to-amber-500 px-5 py-3 text-center font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                    : "mt-8 block rounded-full border border-brand-200 bg-white px-5 py-3 text-center font-semibold text-ink-700 transition-all duration-200 hover:bg-brand-50 hover:text-brand-600"
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-ink-500">
          Hackathon build: subscribing installs the extension in Chrome developer mode — no
          payment is collected.
        </p>
      </div>
    </section>
  );
}

/**
 * Install: the developer-mode unpacked-extension flow every pricing CTA lands
 * on, ending in the demo bank.
 */
function InstallSection() {
  return (
    <section id="install" className="scroll-mt-20 bg-gradient-to-br from-brand-600 to-brand-700">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-100">
            Get Sentinel
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Installed in under two minutes
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-brand-100">
            The hackathon build ships as an unpacked Chrome extension. Four steps and the shield
            is live on every supported bank page.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {install_steps.map((step, index) => (
            <li key={step.title} className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-brand-600">
                <step.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-white">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">{step.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link
            href="/demo-bank"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Watch it catch a scam on the Demo Bank
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Landing route for Sentinel Scam Shield: the product promise, the real
 * architecture behind it, B2C pricing, and the install path — everything a
 * visitor (or a judge) needs on one page.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <DemoVideoSection />
      <ArchitectureSection />
      <PricingSection />
      <InstallSection />
    </>
  );
}
