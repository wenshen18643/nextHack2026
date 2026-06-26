# Audit Ready

A Next.js prototype built for **NexHack 2026** — focused on autonomous AI workflows for enterprise operations and fintech trust.

## Overview

This project explores how AI can assist, automate, or intelligently coordinate real business workflows while remaining explainable, controllable, and realistic for adoption. It targets the hackathon's dual tracks:

- **Track 1:** Agentic AI for Internal Enterprise Operations  
- **Track 2:** Fintech Risk & Fraud Intelligence

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database / Auth:** Supabase
- **Testing:** Vitest
- **Utilities:** Zod, clsx, tailwind-merge, lucide-react

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (for database/auth features)

### Installation

```bash
# Clone the repository
git clone https://github.com/wenshen18643/nextHack2026.git
cd nextHack2026

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Then fill in your Supabase credentials and other secrets

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production app |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run db:seed` | Seed the database |
| `npm test` | Run the test suite |

## Project Structure

```
nextHack2026/
├── docs/            # Requirements and planning documents
├── public/          # Static assets
├── src/             # Application source code
│   ├── app/         # Next.js app router pages
│   ├── components/  # Reusable React components
│   ├── lib/         # Utilities, database, and shared logic
│   └── ...
├── .env             # Environment variables
├── package.json
└── README.md
```

## Philosophy

- **Depth beats breadth** — one practical problem solved deeply > many shallow features.
- **Build what the market will pay for** — solve painful problems that real organizations or fintechs would realistically adopt.
- **Technical + business depth** — sound architecture, rational AI use, and a clear commercialization path.

## License

MIT
