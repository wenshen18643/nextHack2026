# Sentinel Chrome Extension (MVP)

Intercepts **web** bank and e-wallet transfers, scores them with the Sentinel AI
risk firewall, and blocks or warns before the transfer is confirmed.

## Scope & honest limits

- Works on **web pages** (desktop browser) only. It **cannot** read native
  mobile banking/e-wallet apps — no browser extension can. Native coverage
  requires the Sentinel B2B SDK embedded by the institution.
- Detection uses explicit `data-sentinel-*` attributes when a site exposes them,
  otherwise heuristics over form fields and confirm-button text. Real bank DOMs
  vary, so production needs a per-bank adapter; the matchers in `manifest.json`
  list the intended Malaysian banks/e-wallets.

## How it works

```
page "Send Transfer" click
   → content.js pauses it (capture-phase, preventDefault)
   → background.js POST /api/transfer  (cross-origin allowed via host_permissions)
   → engine verdict (PASS / INSPECT / QUARANTINE / DENY)
   → overlay: PASS auto-continues · risky shows warning · DENY blocks
```

## Run the demo

1. Start the app so the API and mock bank page are live:
   ```bash
   npm run dev
   ```
2. Load the extension: open `chrome://extensions`, enable **Developer mode**,
   click **Load unpacked**, and select this `extension/` folder.
3. Open the popup, confirm **API base** is `http://localhost:3000` and **Demo
   account** is `user_aisha` (a seeded user), then Save.
4. Visit `http://localhost:3000/mock-bank.html`.
5. Pick a scenario and click **Send Transfer**:
   - *Normal grocery* → screened, passes through.
   - *Late-night new friend* → AI adjudication (~25-30s), warning overlay.
   - *Authorized-push scam* → blocked outright.

The popup shows a rolling history of verdicts.

## Configuration

- **API base / demo account**: set in the popup.
- **Always use AI**: in `src/background.js`, change the fetch URL to
  `/api/transfer?force_ai=1` to consult Kimi on every transfer (slower).
