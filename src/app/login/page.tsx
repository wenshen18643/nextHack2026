"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

type AuthMode = "sign_in" | "sign_up";

const input_class =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-ink-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1";

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
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-amber-500 text-white">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">
          {mode === "sign_in" ? "Welcome back" : "Create your Sentinel account"}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {mode === "sign_in"
            ? "Sign in to manage your protection."
            : "One minute of setup, calibrated protection for life."}
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => switch_mode("sign_in")}
            className={
              mode === "sign_in"
                ? "rounded-md bg-white py-2 text-brand-600 shadow-sm"
                : "rounded-md py-2 text-ink-500 transition-colors hover:text-brand-600"
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switch_mode("sign_up")}
            className={
              mode === "sign_up"
                ? "rounded-md bg-white py-2 text-brand-600 shadow-sm"
                : "rounded-md py-2 text-ink-500 transition-colors hover:text-brand-600"
            }
          >
            Create account
          </button>
        </div>

        <form onSubmit={handle_submit} className="mt-6 space-y-4">
          {mode === "sign_up" ? (
            <>
              <label className="block">
                <span className="text-sm font-semibold text-ink-700">Full name</span>
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
                <span className="text-sm font-semibold text-ink-700">Birth year</span>
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
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                  Used only to calibrate protection — scammers target older adults with different
                  playbooks, and Sentinel adjusts its thresholds accordingly.
                </span>
              </label>
            </>
          ) : null}
          <label className="block">
            <span className="text-sm font-semibold text-ink-700">Email</span>
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
            <span className="text-sm font-semibold text-ink-700">Password</span>
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
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-brand-600 to-amber-500 px-5 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {submitting ? "Working…" : mode === "sign_in" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
