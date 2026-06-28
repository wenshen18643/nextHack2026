import type { RiskSignal } from "@/lib/risk/types";

/**
 * Renders a list of signals as a compact, log-friendly string.
 *
 * @param signals The signals to summarize.
 * @returns A "CODE(weight)" list, or "none" when empty.
 */
export function summarize_signals(signals: RiskSignal[]): string {
  if (signals.length === 0) {
    return "none";
  }
  return signals.map((signal) => `${signal.code}(${signal.weight})`).join(", ");
}

/**
 * Emits one structured, scoped log line to stdout.
 *
 * Keeps every component's output on a single grep-able format —
 * `[scope] message | key=value ...` — so the multi-agent flow reads top to
 * bottom in the server logs without bespoke formatting at each call site.
 *
 * @param scope   The component emitting the line, e.g. "main-agent".
 * @param message The human-readable event.
 * @param fields  Optional structured key/value pairs to append.
 */
export function log_event(
  scope: string,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const detail = Object.entries(fields)
    .map(([key, value]) => `${key}=${format_field(value)}`)
    .join(" ");
  console.log(detail ? `[${scope}] ${message} | ${detail}` : `[${scope}] ${message}`);
}

/**
 * Formats a single field value for log output, quoting strings that contain
 * spaces so the `key=value` structure stays unambiguous.
 */
function format_field(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text !== undefined && text.includes(" ") ? `"${text}"` : String(text);
}
