# Sentinel Scam Shield

A browser extension that **warns you before you send money to a likely scam** — built for **NexHack 2026** (Track 2: Fintech Risk & Fraud Intelligence).

It intercepts the "Send" action on a supported bank or e-wallet page, hands the **full transfer context** to an AI, and shows a clear warning the instant something looks like a scam — all before the money moves.

## How it works

```
Bank page (Send clicked)
   │  content script intercepts the click before it submits
   ▼
Extension background worker ──► POST /api/screen
   ▼
AI screener (full context: payee, amount, memo, channel, time)
   ▼
Verdict: allow → let it through   |   warn / block → show warning overlay
```

- **AI-first:** the AI receives the complete transfer and decides. Deterministic keyword rules exist only as a fallback for when the AI is unreachable, so a dead key never silently allows everything.
- **No real money is touched.** The extension only *warns*; it cannot freeze a real bank transfer (no third party can). That is the honest, adoptable model.

## Tech stack

- **Backend / demo app:** Next.js 14 (App Router), TypeScript
- **Extension:** Chrome Manifest V3 (vanilla JS)
- **AI:** any OpenAI-compatible chat API (configured for DeepSeek)
- **Validation:** Zod · **Testing:** Vitest

## Project structure

```
extension/            # The Chrome MV3 extension (load this unpacked)
  manifest.json
  content.js          # Intercepts the send click, shows spinner + warning
  background.js       # Calls the screening API
  site_adapters.js    # Per-bank field selectors (the only file to edit per bank)
  overlay.css
src/
  app/api/screen/     # POST /api/screen — the screening endpoint (CORS)
  app/demo-bank/      # A mock bank page to demo the extension safely
  lib/screen/         # ai_screener (AI-first), service, cold_rules (fallback)
  lib/risk/           # Shared scoring utilities (fusion, state machine, types)
docs/                 # Hackathon requirements
```

## Getting started

### 1. Run the screening server

```bash
npm install
cp .env.example .env      # then set KIMI_API_KEY to a DeepSeek (or any OpenAI-compatible) key
npm run dev               # http://localhost:3000
```

### 2. Load the extension

1. Open `chrome://extensions` → enable **Developer mode**.
2. Click **Load unpacked** → select the `extension/` folder.

### 3. See it work

Open `http://localhost:3000/demo-bank`, enter a transfer (e.g. recipient `Crypto Ventures`,
amount `9000`, reference `urgent investment`), and click **Send money** — the shield intercepts
it and shows a scam warning before it completes.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the screening server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest suite |

## License

MIT
