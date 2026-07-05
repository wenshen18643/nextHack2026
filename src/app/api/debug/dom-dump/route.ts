import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const dump_directory = path.join(process.cwd(), "docs", "dom_dumps");
const max_dump_bytes = 8_000_000;
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
 * Builds the dump filename: `<site>.html` for the top frame, or
 * `<site>__<frame-slug>.html` for an iframe so frames never clobber each other.
 *
 * @param host       The dumping frame's hostname.
 * @param frame_path The iframe pathname, or an empty string for the top frame.
 * @returns The filename to write inside the dump directory.
 */
function build_dump_filename(host: string, frame_path: string): string {
  const site = resolve_site_name(host);
  if (!frame_path) {
    return `${site}.html`;
  }
  const slug =
    frame_path
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max_frame_slug_length) || "frame";
  return `${site}__${slug}.html`;
}

/**
 * Receives a DOM snapshot from the extension and writes it to
 * `docs/dom_dumps/`, overwriting any previous dump for the same site/frame.
 * Development-only: disabled in production so the deployed API can never be
 * used as an arbitrary file writer.
 *
 * @param request JSON body `{ host, frame_path, html }`.
 * @returns 200 with the saved filename, or an error status.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

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

  const filename = build_dump_filename(host, typeof frame_path === "string" ? frame_path : "");
  await mkdir(dump_directory, { recursive: true });
  await writeFile(path.join(dump_directory, filename), html, "utf8");

  console.log(`[dom-dump] saved ${filename} (${html.length} bytes) from ${host}`);
  return NextResponse.json({ saved: filename });
}
