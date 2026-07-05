import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { upsert_dom_dump } from "@/lib/db/supabase_client";

const dump_directory = path.join(process.cwd(), "docs", "dom_dumps");
const max_dump_bytes = 4_000_000;
const max_frame_slug_length = 40;

const site_names_by_host_suffix: Record<string, string> = {
  "maybank2u.com.my": "maybank",
  "hongleongconnect.my": "hongleong",
  "cimbclicks.com.my": "cimb",
  "pbebank.com": "publicbank",
  "rhbgroup.com": "rhb",
  "rhb.com.my": "rhb",
  "bankislam.biz": "bankislam",
  "amonline.com.my": "ambank",
  "mybsn.com.my": "bsn",
  "affinalways.com": "affin",
  "allianceonline.com.my": "alliance",
  "irakyat.com.my": "bankrakyat",
  "i-muamalat.com.my": "muamalat",
  "agrobank.com.my": "agrobank",
  "mbsbbank.com": "mbsb",
  "uob.com.my": "uob",
  "ocbc.com.my": "ocbc",
  "hsbc.com.my": "hsbc",
  "sc.com": "standardchartered",
  "tngdigital.com.my": "tng",
  "localhost": "demo",
};

/**
 * Maps a page hostname to a short site name, falling back to the sanitized
 * hostname for banks not yet in the table.
 *
 * @param host The hostname reported by the dumping frame.
 * @returns A filesystem-safe site name.
 */
function resolve_site_name(host: string): string {
  const lowered = host.toLowerCase();
  const matched = Object.entries(site_names_by_host_suffix).find(
    ([suffix]) => lowered === suffix || lowered.endsWith(`.${suffix}`),
  );
  if (matched) {
    return matched[1];
  }
  return lowered.replace(/[^a-z0-9.-]/g, "").replace(/\./g, "_") || "unknown";
}

/**
 * Reduces an iframe pathname to a short slug used to keep frame dumps from
 * clobbering the top-frame dump. The top frame yields an empty slug.
 *
 * @param frame_path The iframe pathname, or an empty string for the top frame.
 * @returns A filesystem-safe slug, empty for the top frame.
 */
function build_frame_slug(frame_path: string): string {
  if (!frame_path) {
    return "";
  }
  return (
    frame_path
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max_frame_slug_length) || "frame"
  );
}

/**
 * Writes the dump to docs/dom_dumps/ when running on a local dev machine.
 * Best-effort: the serverless filesystem is read-only, so failures are logged
 * and ignored.
 *
 * @param site       The resolved site name.
 * @param frame_slug The frame slug, empty for the top frame.
 * @param html       The captured page HTML.
 */
async function write_local_dump_file(
  site: string,
  frame_slug: string,
  html: string,
): Promise<void> {
  const filename = frame_slug ? `${site}__${frame_slug}.html` : `${site}.html`;
  try {
    await mkdir(dump_directory, { recursive: true });
    await writeFile(path.join(dump_directory, filename), html, "utf8");
    console.log(`[dom-dump] saved ${filename} (${html.length} bytes)`);
  } catch (error) {
    console.warn("[dom-dump] local file write skipped:", error);
  }
}

/**
 * Receives a DOM snapshot from the extension and stores it: upserted into the
 * Supabase `dom_dumps` table (works on Vercel) and, in local development,
 * also written to docs/dom_dumps/ for direct inspection.
 *
 * @param request JSON body `{ host, frame_path, html }`.
 * @returns 200 with the stored site/frame identifiers, or an error status.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { host?: unknown; frame_path?: unknown; html?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { host, frame_path, html } = body;
  if (typeof host !== "string" || !host || typeof html !== "string" || !html) {
    return NextResponse.json({ error: "host and html are required" }, { status: 400 });
  }
  if (html.length > max_dump_bytes) {
    return NextResponse.json({ error: "dump too large" }, { status: 413 });
  }

  const site = resolve_site_name(host);
  const frame_slug = build_frame_slug(typeof frame_path === "string" ? frame_path : "");

  const stored_in_db = await upsert_dom_dump({ site, frame_slug, host, html });
  if (process.env.NODE_ENV === "development") {
    await write_local_dump_file(site, frame_slug, html);
  } else if (!stored_in_db) {
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }

  return NextResponse.json({ saved: frame_slug ? `${site}__${frame_slug}` : site });
}
