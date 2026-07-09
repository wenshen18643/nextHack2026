const malaysia_time_zone = "Asia/Kuala_Lumpur";

const malaysia_clock_formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: malaysia_time_zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Parses an ISO timestamp, returning null when it is absent or unparseable so
 * timing rules can skip silently instead of throwing.
 */
function parse_timestamp(iso_timestamp: string | undefined): Date | null {
  if (!iso_timestamp) {
    return null;
  }
  const parsed = new Date(iso_timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns the wall-clock hour (0-23) in Malaysia (Asia/Kuala_Lumpur, UTC+8)
 * for an ISO timestamp, independent of the server's own timezone.
 *
 * @param iso_timestamp The instant to convert, as an ISO-8601 string.
 * @returns The Malaysian hour of day, or null when the timestamp is invalid.
 */
export function get_malaysia_hour(iso_timestamp: string | undefined): number | null {
  const parsed = parse_timestamp(iso_timestamp);
  if (!parsed) {
    return null;
  }
  const hour_part = malaysia_clock_formatter
    .formatToParts(parsed)
    .find((part) => part.type === "hour");
  return hour_part ? Number(hour_part.value) % 24 : null;
}

/**
 * Formats an ISO timestamp as human-readable Malaysian wall-clock time, e.g.
 * "2026-07-10 01:25 (Malaysia time, UTC+8)". Used so every consumer of the
 * screening context — including the AI adjudicator — sees the local time the
 * sender actually experienced, not a bare UTC instant.
 *
 * @param iso_timestamp The instant to format, as an ISO-8601 string.
 * @returns The formatted Malaysian time, or null when the timestamp is invalid.
 */
export function format_malaysia_time(iso_timestamp: string | undefined): string | null {
  const parsed = parse_timestamp(iso_timestamp);
  if (!parsed) {
    return null;
  }
  const parts = new Map(
    malaysia_clock_formatter.formatToParts(parsed).map((part) => [part.type, part.value]),
  );
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")} ${parts.get("hour")}:${parts.get("minute")} (Malaysia time, UTC+8)`;
}
