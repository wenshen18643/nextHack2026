import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { read_session_user } from "@/lib/auth/session";
import { fetch_transfers_for_user, type TransferRecord } from "@/lib/db/supabase_client";

export const metadata = {
  title: "Dashboard — Sentinel Scam Shield",
  description: "Review your screened transfers and scam shield activity.",
};

function format_amount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function format_date(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function AdviceBadge({ advice }: { advice: string }) {
  const normalised = advice.toLowerCase();
  if (normalised === "block") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold text-danger">
        <XCircle className="h-3.5 w-3.5" />
        Blocked
      </span>
    );
  }
  if (normalised === "warn") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-caution/15 px-3 py-1 text-xs font-semibold text-caution">
        <AlertTriangle className="h-3.5 w-3.5" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Allowed
    </span>
  );
}

function ScoreDot({ score }: { score: number }) {
  let colour = "bg-success";
  if (score >= 70) colour = "bg-danger";
  else if (score >= 40) colour = "bg-caution";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colour}`} />
      <span className="font-mono text-sm tabular-nums text-milk">{Math.round(score)}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-ink-lighter bg-void-lift px-6 py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-void-soft text-milk-muted">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-milk">No transfers yet</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-milk-muted">
        Once you attempt a transfer while the Sentinel extension is active, it will appear here with its risk verdict.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-flame-deep"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "muted" | "danger" | "caution" | "success";
}) {
  const tone_classes = {
    muted: "text-milk",
    danger: "text-danger",
    caution: "text-caution",
    success: "text-success",
  };

  return (
    <div className="rounded-2xl border border-ink-lighter bg-void-lift p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-milk-muted">{label}</p>
        <Icon className={`h-5 w-5 ${tone_classes[tone]}`} />
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${tone_classes[tone]}`}>{value}</p>
    </div>
  );
}

function Stats({ transfers }: { transfers: TransferRecord[] }) {
  const total = transfers.length;
  const blocked = transfers.filter((t) => t.advice.toLowerCase() === "block").length;
  const warnings = transfers.filter((t) => t.advice.toLowerCase() === "warn").length;
  const allowed = transfers.filter((t) => t.advice.toLowerCase() === "allow").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Screened" value={total.toString()} icon={Wallet} />
      <StatCard label="Blocked" value={blocked.toString()} icon={XCircle} tone="danger" />
      <StatCard label="Warnings" value={warnings.toString()} icon={AlertTriangle} tone="caution" />
      <StatCard label="Allowed" value={allowed.toString()} icon={CheckCircle2} tone="success" />
    </div>
  );
}

function TransferTable({ transfers }: { transfers: TransferRecord[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-lighter bg-void-lift">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-lighter text-xs uppercase tracking-wide text-milk-faint">
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Recipient</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Memo</th>
              <th className="px-6 py-4 font-semibold">Verdict</th>
              <th className="px-6 py-4 font-semibold">Risk score</th>
              <th className="px-6 py-4 font-semibold">State</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr
                key={transfer.id}
                className="border-b border-ink-light/50 last:border-0 transition-colors hover:bg-void-soft/50"
              >
                <td className="whitespace-nowrap px-6 py-4 text-milk-muted">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {format_date(transfer.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-milk">{transfer.payee}</td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-milk">
                  {format_amount(transfer.amount, transfer.currency)}
                </td>
                <td className="px-6 py-4 text-milk-muted">
                  {transfer.memo ? (
                    <span className="line-clamp-1 max-w-[180px]">{transfer.memo}</span>
                  ) : (
                    <span className="italic text-milk-faint">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <AdviceBadge advice={transfer.advice} />
                </td>
                <td className="px-6 py-4">
                  <ScoreDot score={transfer.score} />
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs uppercase text-milk-faint">{transfer.state}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session_user = read_session_user();
  if (!session_user?.user_id) {
    redirect("/login");
  }

  const transfers = await fetch_transfers_for_user(session_user.user_id);

  return (
    <div className="min-h-screen bg-void-soft pb-20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-milk">Dashboard</h1>
            <p className="mt-1 text-milk-muted">
              Welcome back, <span className="text-milk">{session_user.full_name}</span>. Here is every
              transfer Sentinel has screened for you.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-lighter bg-void-lift px-5 py-2.5 text-sm font-semibold text-milk transition-all hover:border-milk-faint hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {transfers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            <Stats transfers={transfers} />
            <TransferTable transfers={transfers} />
          </div>
        )}

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-ink-lighter bg-void-lift p-4 text-sm text-milk-muted">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-flame" />
          <p>
            Sentinel records transfers as they are screened by the extension. Only transfers made while
            you are signed in and the extension is active will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
