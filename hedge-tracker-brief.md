# Hedge Tracker — Project Brief

This document is a complete handoff for building a long-term investment portfolio tracker.
Paste this at the start of a Claude Code session in an empty project folder.

---

## Project goal

Build a personal portfolio tracker that helps a retail investor manage a $2,000 long-term
investment account by:

1. Showing current holdings and drift from target allocation
2. Tracking the latest 13F filings of selected long-term hedge funds
3. Surfacing relevant sector/thematic moves (defense, energy, semis/AI)
4. Generating weekly rebalancing alerts via dashboard and email
5. Hosted on Vercel, viewable from anywhere

This is NOT an autonomous trading agent. It only proposes; the user executes trades manually
through their own brokerage.

---

## Tech stack

- **Framework:** Next.js 14+ with App Router, TypeScript
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (free tier)
- **Stock prices:** Stooq.com CSV endpoint (free, no key, ~15min delay) with yahoo-finance2 npm
  package as fallback
- **13F data:** SEC EDGAR direct (free, requires User-Agent header)
- **Email:** Resend (free tier, 3000/mo)
- **Storage:** JSON config file in repo for portfolio (no database needed at this scale)
- **Cron:** Vercel cron jobs (weekly trigger Sundays 9am ET)

---

## Portfolio configuration ($2,000 total)

### Core (80% = $1,600)

Broad equity foundation ($1,000):
- VOO — $600 (30%)
- QQQ — $250 (12.5%)
- VXUS — $150 (7.5%)

Long-term value/quality picks ($600):
- BRK.B — $150 (7.5%)
- GOOGL — $150 (7.5%)
- MA — $150 (7.5%)
- BN (Brookfield) — $150 (7.5%)

### Speculation sleeve (15% = $300)

Ring-fenced; treat as money the user is prepared to lose. Never refilled from core.
- SHLD — $150 (7.5%) — defense ETF
- XLE — $100 (5%) — energy/oil
- SMH — $50 (2.5%) — semiconductors

### Cash (5% = $100)

Held in money market fund within brokerage. Used for opportunistic adds during drawdowns.

---

## Hedge funds to track (13F filings)

Long-term value oriented:
- Berkshire Hathaway (CIK 0001067983)
- Pershing Square Capital Management (Bill Ackman, CIK 0001336528)
- Akre Capital Management (CIK 0001112520)
- Sequoia Fund / Ruane Cunniff (CIK 0000089043)
- Greenlight Capital (David Einhorn, CIK 0001079114)
- Baupost Group (Seth Klarman, CIK 0001061165)

Tiger Cubs:
- Coatue Management (CIK 0001135730)
- Lone Pine Capital (CIK 0001061768)
- Viking Global Investors (CIK 0001103804)
- Tiger Global Management (CIK 0001167483)

Activists:
- Third Point (Daniel Loeb, CIK 0001040273)
- ValueAct Capital (CIK 0001418814)
- Trian Fund Management (CIK 0001345471)

(Verify all CIKs against SEC EDGAR before fetching — these are best guesses and should be
confirmed via https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany)

---

## Special panel: "Situational Awareness thesis tracker"

Leopold Aschenbrenner's Situational Awareness LP doesn't file public 13Fs (too new / too small
/ uses non-13F instruments). Instead, build a panel that tracks AI compute thesis names that
align with his publicly stated thesis:

- NVDA — semis
- AVGO — networking/custom silicon
- TSM — foundry
- ASML — lithography
- VRT — power infrastructure (Vertiv)
- CEG — nuclear power (Constellation)
- GEV — power generation (GE Vernova)
- SMCI — AI server hardware

Alert when 3+ of these move >5% in the same direction in a week.

---

## Alert system specification

### Trigger types and thresholds

1. **Drift alert (yellow/warn)** — Any holding drifts ±2% from target allocation
2. **Drawdown opportunity (blue/info)** — Single ticker down >10% in 7 days
3. **Hedge fund move (green/good)** — Tracked fund opens new position OR changes existing
   position by >20%
4. **Conviction reinforcement (gray/neutral)** — Tracked fund adds to position user already
   holds (directly or via BRK.B)
5. **Major drawdown (red/danger)** — Total portfolio down ≥15% from all-time high
6. **AI thesis tracker (blue/info)** — 3+ Situational Awareness names move >5% same direction
7. **Cash deployment (green/good)** — User-initiated; suggests how to deploy new contributions

### Alert content structure

Each alert must include:
- Title with trigger and threshold metadata
- Brief explanation of what changed
- Suggested action (or explicit "no action needed")
- Projected impact line showing portfolio after action

### Frequency

- Data refresh: weekly (Sunday 9am ET cron)
- Email digest: weekly (only if 1+ alerts triggered, never empty emails)
- Dashboard: always shows current state when visited

---

## Project structure

```
hedge-tracker/
├── app/
│   ├── page.tsx                    # Main dashboard
│   ├── settings/page.tsx           # Edit portfolio config
│   ├── api/
│   │   ├── prices/route.ts         # Fetch current prices
│   │   ├── filings/route.ts        # Fetch latest 13Fs
│   │   ├── alerts/route.ts         # Compute current alerts
│   │   └── cron/route.ts           # Weekly cron handler
├── components/
│   ├── HoldingsPanel.tsx
│   ├── AlertsPanel.tsx
│   ├── HedgeFundsPanel.tsx
│   ├── SectorPanel.tsx
│   └── ThesisTrackerPanel.tsx
├── lib/
│   ├── edgar.ts                    # SEC EDGAR fetching
│   ├── prices.ts                   # Stooq + yahoo-finance2
│   ├── alerts.ts                   # Alert computation
│   ├── email.ts                    # Resend integration
│   └── portfolio.ts                # Portfolio config loading
├── config/
│   └── portfolio.json              # User-editable portfolio
├── vercel.json                     # Cron config
└── .env.local                      # RESEND_API_KEY, ALERT_EMAIL
```

---

## Build order (suggested)

Build in phases. Get user approval after each phase before continuing.

**Phase 1 — Scaffolding and dashboard with mock data**
- Set up Next.js project
- Build dashboard layout with all panels
- Hard-code mock data for everything
- User can run `npm run dev` and see the site locally

**Phase 2 — Real prices**
- Wire up Stooq for live prices
- Compute drift in real-time
- Show actual portfolio values

**Phase 3 — Real 13F data**
- Implement SEC EDGAR fetching with proper User-Agent
- Parse XML, extract holdings
- Cache aggressively (filings only update quarterly)
- Show real fund holdings on dashboard

**Phase 4 — Alert engine**
- Implement all 7 alert types from spec
- Render dynamically on dashboard

**Phase 5 — Email + cron**
- Resend integration
- Vercel cron config
- Test email digest

**Phase 6 — Deploy**
- Push to GitHub
- Connect Vercel
- Set environment variables
- Verify cron runs

---

## Important constraints

- **No autonomous trading.** This tool only proposes; user executes manually.
- **No financial advice disclaimers in UI.** Footer should note: "Not investment advice.
  Educational tool. Verify all data independently."
- **SEC EDGAR requires User-Agent header** with contact info — use the user's email or a
  generic project email like "hedge-tracker contact@example.com"
- **Respect SEC rate limits** — max 10 requests/second. With 13 funds and quarterly updates,
  this is trivial but cache aggressively.
- **45-day filing lag is real.** Always show "Filed [date]" prominently so user knows data is
  not real-time. Add tooltip explaining the lag.
- **CIK numbers in this brief may be wrong** — verify each against EDGAR before building.

---

## Out of scope

- Mobile app (web responsive only)
- Brokerage integration
- Trade execution
- Options pricing or analysis
- Backtesting
- Real-time websocket prices (15-min delay is fine for weekly cadence)
- User accounts / multi-user support (single user, single portfolio)
- News scraping (deferred to future iteration)
