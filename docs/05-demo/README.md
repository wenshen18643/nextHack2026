# Demo Video

The canonical demo video lives here at `docs/05-demo/demo.mp4`.

The landing page checks for this file before rendering the demo-video section. At dev/build time, the `predev`/`prebuild` hooks copy it into `public/demo.mp4` so Next.js can serve it at `/demo.mp4`.

## How to add or update the video

1. Replace `docs/05-demo/demo.mp4` with your new recording (recommended: 1080p, ≤60 seconds).
2. Run `npm run predev` (or let `npm run dev` / `npm run build` trigger it automatically).
3. The landing page will show the “Watch Sentinel catch a scam” section on the next build.

`public/demo.mp4` is gitignored because it is a generated copy — only commit the version in `docs/05-demo/`.

## What to show

A strong demo captures the core moment:

- A suspicious transfer being entered on a supported bank page.
- The user clicking **Send** / **Confirm**.
- The Sentinel overlay appearing with the risk score and reasoning.
- The user cancelling the transfer.

Keep the recipient and amount realistic for a Malaysian scam pattern (e.g. “MULE HOLDINGS 8829”, RM 9,000). For the reference, use something innocuous or leave it blank — this proves Sentinel is not relying on scam keywords and that the amount, timing, history, and population signals still fire.
