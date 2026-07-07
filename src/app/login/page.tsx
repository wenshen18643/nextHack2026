"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

type AuthMode = "sign_in" | "sign_up";

const input_class =
  "mt-1.5 w-full rounded-xl border border-ink-lighter bg-void-soft px-4 py-3 text-milk placeholder:text-milk-muted transition-colors focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame";

const mode_tab_base =
  "rounded-full py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame";

/**
 * Sends the form payload to the given auth endpoint and returns the error
 * message to display, or null on success.
 */
async function submit_auth_request(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      return result.error ?? "Something went wrong. Please try again.";
    }
    return null;
  } catch {
    return "Could not reach the server. Please try again.";
  }
}

/**
 * Sign-in / sign-up page. Sign-up additionally collects the birth year that
 * powers age-aware protection; the why is stated inline for PDPA transparency.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, set_mode] = useState<AuthMode>("sign_in");
  const [error, set_error] = useState<string | null>(null);
  const [submitting, set_submitting] = useState(false);

  async function handle_submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    set_error(null);
    set_submitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const failure =
      mode === "sign_in"
        ? await submit_auth_request("/api/auth/login", { email, password })
        : await submit_auth_request("/api/auth/signup", {
            email,
            password,
            full_name: String(form.get("full_name") ?? ""),
            birth_year: Number(form.get("birth_year") ?? 0),
          });

    if (failure) {
      set_error(failure);
      set_submitting(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  function switch_mode(next_mode: AuthMode) {
    set_mode(next_mode);
    set_error(null);
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(249,115,22,0.12),transparent)]" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-flame text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-milk">
            {mode === "sign_in" ? "Welcome back" : "Create your Sentinel account"}
          </h1>
          <p className="mt-2 text-milk-muted">
            {mode === "sign_in"
              ? "Sign in to manage your protection."
              : "One minute of setup, calibrated protection for life."}
          </p>
        </div>

        <div className="mt-9 rounded-3xl border border-ink-lighter bg-void-lift p-7">
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-1 rounded-full bg-void p-1 text-sm font-semibold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sign_in"}
              onClick={() => switch_mode("sign_in")}
              className={
                mode === "sign_in"
                  ? `${mode_tab_base} border border-ink-lighter bg-void-lift text-milk`
                  : `${mode_tab_base} text-milk-muted hover:text-milk`
              }
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sign_up"}
              onClick={() => switch_mode("sign_up")}
              className={
                mode === "sign_up"
                  ? `${mode_tab_base} border border-ink-lighter bg-void-lift text-milk`
                  : `${mode_tab_base} text-milk-muted hover:text-milk`
              }
            >
              Create account
            </button>
          </div>

          <form onSubmit={handle_submit} className="mt-7 space-y-5">
            {mode === "sign_up" ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-milk-dim">Full name</span>
                  <input
                    name="full_name"
                    required
                    minLength={2}
                    autoComplete="name"
                    className={input_class}
                    placeholder="Aisyah binti Rahman"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-milk-dim">Birth year</span>
                  <input
                    name="birth_year"
                    required
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={new Date().getFullYear() - 13}
                    autoComplete="bday-year"
                    className={input_class}
                    placeholder="1962"
                  />
                  <span className="mt-2 block text-xs leading-relaxed text-milk-muted">
                    Used only to calibrate protection — scammers target older adults with
                    different playbooks, and Sentinel adjusts its thresholds accordingly.
                  </span>
                </label>
              </>
            ) : null}
            <label className="block">
              <span className="text-sm font-medium text-milk-dim">Email</span>
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                className={input_class}
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-milk-dim">Password</span>
              <input
                name="password"
                required
                type="password"
                minLength={mode === "sign_up" ? 8 : 1}
                autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
                className={input_class}
                placeholder={mode === "sign_up" ? "At least 8 characters" : "Your password"}
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-flame px-8 py-3.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-flame-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame focus-visible:ring-offset-2 focus-visible:ring-offset-void-lift disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? "Working…" : mode === "sign_in" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-milk-faint">
          Warns before the money moves. Never freezes your account.
        </p>
      </div>
    </div>
  );
}
