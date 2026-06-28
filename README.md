# 🛡️ Sentinel Scam Shield

> A browser extension that uses AI to warn people **before** they send money to a likely scam — reading the live transfer on their bank's page and flagging it the instant something looks wrong.

Built for **NexHack 2026** — Track 2: *Fintech Risk & Fraud Intelligence*.

---

## Table of Contents

- [What it is](#what-it-is)
- [Why it matters](#why-it-matters)
- [How it works](#how-it-works)
- [Install it (no setup)](#install-it-no-setup)
- [Prerequisites](#prerequisites)
- [Run it locally (for developers)](#run-it-locally-for-developers)
- [Usage](#usage)
  - [Run the demo](#run-the-demo)
  - [Call the screening API directly](#call-the-screening-api-directly)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Honest limitations](#honest-limitations)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## What it is

Sentinel Scam Shield is a **Chrome (Manifest V3) extension** plus a small **Next.js screening service**. When a user is about to send money on a supported bank or e-wallet website, the extension:

1. **Intercepts** the "Send" click before it submits,
2. Sends the **complete transfer context** (recipient, amount, reference/memo) to an AI,
3. Shows a clear **warning overlay** if the transfer looks like a scam — so the user can cancel before the money leaves.

It is **AI-first**: the AI sees the whole transfer and makes the call. A small set of deterministic keyword rules exists only as a fallback for when the AI is unreachable, so a dead API key never silently waves everything through.

## Why it matters

Authorized-push-payment (APP) scams — fake investments, impersonation, "urgent" transfers — cost Malaysians hundreds of millions a year. The money is gone the moment the victim hits send. Sentinel inserts a **last-second, context-aware warning** at exactly that moment, on the bank pages people already use, with **no integration required from the bank**.

## How it works

```
┌───────────────────────────────────────────────────────────┐
│  Bank / wallet website  (CIMB Clicks, or the demo bank)    │
│  user clicks “Send money”                                  │
└─────────────────┬─────────────────────────────────────────┘
                  │  content.js intercepts the click (capture phase)
                  │  reads payee / amount / memo via a per-bank adapter
                  ▼
          ┌───────────────┐        ┌──────────────────────────────┐
          │ background.js │ ─────▶ │  Next.js  POST /api/screen     │
          └───────────────┘        │   ├─ ai_screener  (AI-first)   │ → DeepSeek
                  ▲                 │   └─ cold_rules   (fallback)   │
                  │                 └──────────────┬───────────────┘
                  │  verdict: allow | warn | block │
                  ◀────────────────────────────────┘
                  │
   allow ───────▶ let the transfer proceed untouched
   warn / block ▶ show warning overlay → user cancels or proceeds
```

The AI receives the entire transfer as JSON, so adding a new observed field automatically makes it part of the model's reasoning. Per-bank field selectors are the **only** thing that changes between banks, and they live in one file (`extension/site_adapters.js`).

## Install it (no setup)

The screening service is **already hosted** at [`next-hack2026.vercel.app`](https://next-hack2026.vercel.app/), so end users do **not** need Node, an API key, or a local server. They only load the extension into Chrome:

1. **Download the extension folder.** Either clone the repo, or download it as a ZIP from GitHub (**Code → Download ZIP**) and unzip it. You only need the **`extension/`** folder.
2. Open `chrome://extensions` in Chrome (or Edge / Brave).
3. Toggle **Developer mode** on — top-right corner.
4. Click **Load unpacked**.
5. Select the **`extension/`** folder.
6. Done — the 🛡️ Sentinel icon appears in your toolbar.

To try it, open the live demo bank: **https://next-hack2026.vercel.app/demo-bank**, enter a suspicious transfer (e.g. recipient `Crypto Ventures`, amount `9000`, reference `urgent investment`), and click **Send money**. You'll see the AI warning before it "sends."

> **Sharing it:** zip the `extension/` folder and send it. Whoever unzips it repeats steps 2–5 above. Because the backend is hosted, the zip works for them with zero configuration.

## Prerequisites

You only need these to **run or modify the backend** — not to use the extension (see above).

- **Node.js 18+** and npm
- A **Chromium browser** (Chrome, Edge, or Brave) for the extension
- An **OpenAI-compatible AI API key** — the demo is configured for [DeepSeek](https://platform.deepseek.com/), but Groq, Moonshot, or OpenAI work by changing three env values. Without a key the app still runs on the deterministic fallback.

## Run it locally (for developers)

```bash
# 1. Clone
git clone https://github.com/wenshen18643/nextHack2026.git
cd nextHack2026

# 2. Install dependencies
npm install

# 3. Configure the AI provider
cp .env.example .env
#   then open .env and set KIMI_API_KEY to your DeepSeek (or other) key

# 4. Start the screening server
npm run dev          # serves http://localhost:3000
```

Load the extension as in [Install it](#install-it-no-setup). To point it at your **local** server instead of the hosted one, change `default_api_base` in `extension/background.js` back to `http://localhost:3000`, or set `api_base` in `chrome.storage.sync`.

## Usage

### Run the demo

1. Open the hosted demo bank: **https://next-hack2026.vercel.app/demo-bank** (or `http://localhost:3000/demo-bank` if running locally)
2. Enter a suspicious transfer, e.g. recipient `Crypto Ventures`, amount `9000`, reference `urgent investment`
3. Click **Send money**

You'll see a brief **"AI is checking…"** spinner, then a red **scam warning** with the AI's reasoning — before the transfer "completes." A normal transfer (e.g. `Mak Cik Nasi Lemak`, `12`, `breakfast`) passes straight through.

### Call the screening API directly

The extension is just a client of one endpoint. You can hit it yourself:

```bash
curl -s https://next-hack2026.vercel.app/api/screen \
  -H "content-type: application/json" \
  -d '{"payee":"Crypto Ventures","amount":9000,"memo":"urgent investment guaranteed returns"}'
```

Example response:

```json
{
  "advice": "block",
  "score": 88,
  "reason": "The large amount combined with guaranteed-returns investment language matches a common Malaysian scam pattern.",
  "signals": [],
  "ai_used": true
}
```

| Field | Meaning |
|-------|---------|
| `advice` | `allow` (let it through), `warn`, or `block` |
| `score` | Risk score `0–100` |
| `reason` | One-sentence explanation shown to the user |
| `ai_used` | `true` if the AI decided, `false` if the fallback rules did |

## Configuration

All configuration is environment variables in `.env` (see `.env.example`). The AI variables are named `KIMI_*` for historical reasons but point at **any** OpenAI-compatible provider:

| Variable | Description | Example |
|----------|-------------|---------|
| `KIMI_API_KEY` | API key for the AI provider | `sk-...` |
| `KIMI_BASE_URL` | Provider base URL | `https://api.deepseek.com` |
| `KIMI_MODEL` | Model name | `deepseek-chat` |
| `KIMI_TEMPERATURE` | Sampling temperature (keep low for reliable JSON) | `0.2` |

To support a new bank, add an adapter to **`extension/site_adapters.js`** (its CSS selectors for the recipient field, amount field, and send button) and add the bank's domain to `extension/manifest.json`.

## Project structure

```
extension/                 # Chrome MV3 extension (load this unpacked)
  manifest.json            #   permissions + which sites to run on
  content.js               #   intercepts the send click, spinner + warning overlay
  background.js            #   calls the screening API
  site_adapters.js         #   per-bank field selectors (the only per-bank file)
  overlay.css              #   warning + spinner styles
src/
  app/api/screen/route.ts  # POST /api/screen — the screening endpoint (CORS-enabled)
  app/demo-bank/page.tsx   # a mock bank page for safe demos
  app/page.tsx             # landing page
  lib/screen/
    ai_screener.ts         #   AI-first screener (full-context prompt)
    service.ts             #   orchestration + fallback
    cold_rules.ts          #   deterministic keyword fallback
  lib/risk/                # shared scoring utilities (types, fusion, state machine)
docs/                      # hackathon requirements
```

## Testing

```bash
npm test          # Vitest unit tests
npm run typecheck # TypeScript, no emit
npm run lint      # ESLint (next lint)
npm run build     # production build
```

## Honest limitations

These are deliberate, and worth stating plainly:

- **It warns, it does not freeze.** No third party can stop another bank's transfer; doing so needs a banking license. Sentinel only advises — which is what makes it adoptable without regulatory approval.
- **It works on bank *websites*, not app-only wallets.** A browser extension can reach CIMB Clicks on the web, but not the Touch 'n Go app. App coverage would need a separate Android accessibility build.
- **No transaction history.** On a real bank page the extension sees only the current transfer, so it does scam-pattern detection on that transfer rather than behavioral profiling — which is exactly what catches APP scams.
- **Demo-grade extension.** Bank pages change their markup and have anti-tampering defenses; the production model is an API a bank embeds, not a sideloaded extension.

## Contributing

Contributions are welcome:

1. Fork the repo and create a feature branch (`git checkout -b feat/my-change`).
2. Make your change; ensure `npm run typecheck`, `npm run lint`, and `npm test` all pass.
3. Open a pull request describing the change and how you verified it.

For a new bank adapter, include the field selectors and a note on how you confirmed them.

## Support

- **Bugs / feature requests:** open a [GitHub issue](https://github.com/wenshen18643/nextHack2026/issues).

## License

Released under the [MIT License](./LICENSE).
