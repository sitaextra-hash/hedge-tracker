import type { ComputedHolding } from "./portfolio";
import type { PriceResult } from "./prices";
import type { FundActivity } from "./edgar";

export type AlertSeverity = "yellow" | "blue" | "green" | "gray" | "red";
export type AlertType =
  | "drift"
  | "drawdown"
  | "hedge-fund"
  | "conviction"
  | "major-drawdown"
  | "ai-thesis"
  | "cash-deploy";

export type Alert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string;
  action: string;
  impact: string;
  timestamp: string;
};

const today = () => new Date().toISOString().split("T")[0];

function weekChangePct(p: PriceResult): number | null {
  if (!p.weekAgoPrice || p.weekAgoPrice <= 0) return null;
  return ((p.price - p.weekAgoPrice) / p.weekAgoPrice) * 100;
}

// Alert 1: Drift ±2%
function driftAlerts(holdings: ComputedHolding[]): Alert[] {
  return holdings
    .filter((h) => Math.abs(h.drift) >= 2)
    .map((h) => {
      const over = h.drift > 0;
      const dollarDiff = Math.abs(h.currentAmount - h.targetAmount);
      const action = over
        ? `Consider trimming ~$${dollarDiff.toFixed(0)} of ${h.ticker} to return to ${h.targetPct}% target.`
        : `Consider adding ~$${dollarDiff.toFixed(0)} to ${h.ticker} to return to ${h.targetPct}% target.`;
      return {
        id: `drift-${h.ticker}`,
        type: "drift" as AlertType,
        severity: "yellow" as AlertSeverity,
        title: `${h.ticker} drifted ${h.drift > 0 ? "+" : ""}${h.drift.toFixed(1)}% from target`,
        body: `Current allocation ${h.currentPct.toFixed(1)}% vs target ${h.targetPct}% (${over ? "overweight" : "underweight"} by $${dollarDiff.toFixed(0)}).`,
        action,
        impact: `After rebalance: ${h.ticker} → ${h.targetPct}%`,
        timestamp: today(),
      };
    });
}

// Alert 2: Single ticker drawdown >10% in 7 days
function drawdownAlerts(
  holdings: ComputedHolding[],
  prices: Map<string, PriceResult>
): Alert[] {
  return holdings.flatMap((h) => {
    const p = prices.get(h.ticker);
    if (!p) return [];
    const wc = weekChangePct(p);
    if (wc === null || wc > -10) return [];
    return [
      {
        id: `drawdown-${h.ticker}`,
        type: "drawdown" as AlertType,
        severity: "blue" as AlertSeverity,
        title: `${h.ticker} down ${Math.abs(wc).toFixed(1)}% this week`,
        body: `Fell from $${p.weekAgoPrice!.toFixed(2)} to $${p.price.toFixed(2)} over the past 7 days.`,
        action: `Potential opportunity to add from cash reserve if conviction unchanged. Current position: $${h.currentAmount.toFixed(0)}.`,
        impact: `Adding $50 from cash would bring ${h.ticker} allocation to ${((h.currentAmount + 50) / (holdings.reduce((s, x) => s + x.currentAmount, 0)) * 100).toFixed(1)}%`,
        timestamp: today(),
      },
    ];
  });
}

// Alert 3: Hedge fund notable new position or >20% change
function hedgeFundAlerts(activities: FundActivity[]): Alert[] {
  const notable = activities.filter(
    (a) => a.action === "new" || (a.action !== "hold" && Math.abs(a.changePct) >= 20)
  );

  // Deduplicate: keep one per (fund, issuer, action)
  const seen = new Set<string>();
  return notable.flatMap((a) => {
    const key = `${a.fund}|${a.issuer}|${a.action}`;
    if (seen.has(key)) return [];
    seen.add(key);

    const isNew = a.action === "new";
    const isExit = a.action === "exit";
    const valueStr = a.valueThousands > 0
      ? ` (position value: $${(a.valueThousands / 1000).toFixed(0)}M)`
      : "";

    return [
      {
        id: `hf-${a.fund.replace(/\s/g, "-")}-${a.issuer.slice(0, 10)}`,
        type: "hedge-fund" as AlertType,
        severity: "green" as AlertSeverity,
        title: `${a.fund}: ${isNew ? "new position in" : isExit ? "exited" : a.action === "trim" ? "trimmed" : "added to"} ${a.issuer}`,
        body: `${a.fund} ${isNew ? "opened a new position in" : isExit ? "fully exited" : a.action === "trim" ? "trimmed position in" : "added to position in"} ${a.issuer}${valueStr}. Filed ${a.filedDate} (reflects ${a.periodOfReport} quarter-end).`,
        action: isNew
          ? `Research ${a.issuer} — high-conviction fund entering a new position.`
          : isExit
          ? `Review your exposure to ${a.issuer} if applicable.`
          : "No action needed — monitor.",
        impact: "No direct portfolio impact — informational signal.",
        timestamp: a.filedDate,
      },
    ];
  }).slice(0, 10); // cap at 10 fund alerts
}

// Alert 4: Conviction reinforcement — fund adds to a position the user holds
// Explicit issuer name keywords for each portfolio ticker — must be a distinct word/prefix
const ISSUER_KEYWORDS: Record<string, string[]> = {
  "VOO":   ["VANGUARD S&P", "VANGUARD 500"],
  "QQQ":   ["INVESCO QQQ", "POWERSHARES QQQ"],
  "VXUS":  ["VANGUARD TOTAL INTL"],
  "BRK.B": ["BERKSHIRE HATHAWAY"],
  "GOOGL": ["ALPHABET INC", "GOOGLE"],
  "MA":    ["MASTERCARD"],
  "BN":    ["BROOKFIELD CORP", "BROOKFIELD ASSET"],
  "SHLD":  ["SHIELD", "DEFENSE ETF"],
  "XLE":   ["ENERGY SELECT"],
  "SMH":   ["SEMICONDUCTOR", "VAN ECK SEMI"],
};

function convictionAlerts(
  holdings: ComputedHolding[],
  activities: FundActivity[]
): Alert[] {
  const adds = activities.filter(
    (a) =>
      (a.action === "add" || a.action === "new") &&
      holdings.some((h) => {
        const keywords = ISSUER_KEYWORDS[h.ticker] ?? [];
        return keywords.some((kw) => a.issuer.toUpperCase().includes(kw));
      })
  );

  const seen = new Set<string>();
  return adds.flatMap((a) => {
    const key = `conviction-${a.fund}-${a.issuer}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        id: key,
        type: "conviction" as AlertType,
        severity: "gray" as AlertSeverity,
        title: `Conviction reinforced: ${a.fund} added to ${a.issuer}`,
        body: `${a.fund} ${a.action === "new" ? "opened" : "added to"} a position in ${a.issuer}, which overlaps with your holdings. Filed ${a.filedDate}.`,
        action: "No action needed — your existing position aligns with this fund's conviction.",
        impact: "Conviction signal — holds steady.",
        timestamp: a.filedDate,
      },
    ];
  });
}

// Alert 5: Major drawdown — portfolio down ≥15% from target value
function majorDrawdownAlert(holdings: ComputedHolding[]): Alert[] {
  const totalCurrent = holdings.reduce((s, h) => s + h.currentAmount, 0);
  const totalTarget = holdings.reduce((s, h) => s + h.targetAmount, 0);
  const drawdownPct = ((totalTarget - totalCurrent) / totalTarget) * 100;
  if (drawdownPct < 15) return [];
  return [
    {
      id: "major-drawdown",
      type: "major-drawdown" as AlertType,
      severity: "red" as AlertSeverity,
      title: `Portfolio down ${drawdownPct.toFixed(1)}% from target value`,
      body: `Total portfolio value $${totalCurrent.toFixed(0)} vs $${totalTarget.toFixed(0)} target — a $${(totalTarget - totalCurrent).toFixed(0)} drawdown.`,
      action: "Review holdings. Consider deploying cash reserve into highest-conviction names at current prices.",
      impact: `Deploying full $100 cash reserve would bring portfolio to $${(totalCurrent + 100).toFixed(0)}.`,
      timestamp: today(),
    },
  ];
}

// Alert 6: AI thesis — 3+ Situational Awareness names move >5% same direction in a week
function aiThesisAlert(
  thesisTickers: string[],
  prices: Map<string, PriceResult>
): Alert[] {
  const movers = thesisTickers.flatMap((ticker) => {
    const p = prices.get(ticker);
    if (!p) return [];
    const wc = weekChangePct(p);
    if (wc === null) return [];
    return [{ ticker, wc }];
  });

  const up = movers.filter((m) => m.wc > 5);
  const down = movers.filter((m) => m.wc < -5);

  const alerts: Alert[] = [];
  if (up.length >= 3) {
    alerts.push({
      id: "ai-thesis-up",
      type: "ai-thesis" as AlertType,
      severity: "blue" as AlertSeverity,
      title: `AI Thesis: ${up.length} names up >5% this week`,
      body: `${up.map((m) => `${m.ticker} +${m.wc.toFixed(1)}%`).join(", ")} all moved up together — potential AI compute momentum.`,
      action: "Monitor SMH exposure. This is a correlated move across the AI compute theme.",
      impact: "No action needed — SMH captures this theme in your portfolio.",
      timestamp: today(),
    });
  }
  if (down.length >= 3) {
    alerts.push({
      id: "ai-thesis-down",
      type: "ai-thesis" as AlertType,
      severity: "blue" as AlertSeverity,
      title: `AI Thesis: ${down.length} names down >5% this week`,
      body: `${down.map((m) => `${m.ticker} ${m.wc.toFixed(1)}%`).join(", ")} all moved down together — potential AI compute rotation.`,
      action: "Consider whether SMH position warrants review given broad sector weakness.",
      impact: "SMH position at risk if theme continues to rotate.",
      timestamp: today(),
    });
  }
  return alerts;
}

export function computeAlerts(
  holdings: ComputedHolding[],
  prices: Map<string, PriceResult>,
  activities: FundActivity[],
  thesisTickers: string[]
): Alert[] {
  return [
    ...majorDrawdownAlert(holdings),          // red first
    ...driftAlerts(holdings),                 // yellow
    ...drawdownAlerts(holdings, prices),      // blue
    ...aiThesisAlert(thesisTickers, prices),  // blue
    ...hedgeFundAlerts(activities),           // green
    ...convictionAlerts(holdings, activities),// gray
  ];
}
