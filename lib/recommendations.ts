import type { ComputedHolding } from "./portfolio";
import type { FundActivity } from "./edgar";

export type Recommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  action: "buy" | "sell" | "hold" | "watch";
  ticker: string;
  amountUsd: number | null; // null for watch/hold
  reasoning: string[]; // bullet points of why
  confidence: number; // 0..100 — composite signal strength
};

// Map portfolio tickers to issuer-name keywords (reused from alerts)
const ISSUER_KEYWORDS: Record<string, string[]> = {
  "VOO":   ["VANGUARD S&P", "VANGUARD 500"],
  "QQQ":   ["INVESCO QQQ"],
  "VXUS":  ["VANGUARD TOTAL INTL"],
  "BRK.B": ["BERKSHIRE HATHAWAY"],
  "GOOGL": ["ALPHABET INC", "GOOGLE"],
  "MA":    ["MASTERCARD"],
  "BN":    ["BROOKFIELD CORP", "BROOKFIELD ASSET"],
  "SHLD":  ["SHIELD", "DEFENSE ETF"],
  "XLE":   ["ENERGY SELECT"],
  "SMH":   ["SEMICONDUCTOR", "VAN ECK SEMI"],
};

function countFundBacking(ticker: string, activities: FundActivity[]): number {
  const keywords = ISSUER_KEYWORDS[ticker] ?? [];
  if (keywords.length === 0) return 0;
  const backingFunds = new Set<string>();
  for (const a of activities) {
    if (a.action !== "add" && a.action !== "new") continue;
    if (keywords.some((kw) => a.issuer.toUpperCase().includes(kw))) {
      backingFunds.add(a.fund);
    }
  }
  return backingFunds.size;
}

export function computeRecommendations(
  holdings: ComputedHolding[],
  activities: FundActivity[],
  cashAvailable = 100
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const h of holdings) {
    const reasoning: string[] = [];
    let score = 0; // positive = buy, negative = sell
    let priority: Recommendation["priority"] = "low";

    // 1. Drift signal (primary)
    if (h.drift <= -2) {
      score += 40;
      reasoning.push(`Underweight by ${Math.abs(h.drift).toFixed(1)}% ($${Math.abs(h.currentAmount - h.targetAmount).toFixed(0)} below target)`);
    } else if (h.drift >= 2) {
      score -= 40;
      reasoning.push(`Overweight by ${h.drift.toFixed(1)}% ($${(h.currentAmount - h.targetAmount).toFixed(0)} above target)`);
    }

    // 2. Short-term drawdown (opportunity if core, warning if speculation)
    if (h.weekChangePct !== null && h.weekChangePct <= -10) {
      if (h.sleeve !== "speculation") {
        score += 25;
        reasoning.push(`Down ${Math.abs(h.weekChangePct).toFixed(1)}% this week — potential add on weakness`);
      } else {
        reasoning.push(`Down ${Math.abs(h.weekChangePct).toFixed(1)}% this week in speculation sleeve — do not refill from core`);
      }
    }

    // 3. 52-week range position
    if (h.fiftyTwoWeekPosition !== null) {
      if (h.fiftyTwoWeekPosition < 20) {
        score += 15;
        reasoning.push(`Near 52-week low (${h.fiftyTwoWeekPosition.toFixed(0)}% of range)`);
      } else if (h.fiftyTwoWeekPosition > 90) {
        score -= 10;
        reasoning.push(`Near 52-week high (${h.fiftyTwoWeekPosition.toFixed(0)}% of range)`);
      }
    }

    // 4. Valuation — P/E only meaningful for individual stocks, not ETFs
    if (h.peRatio && h.sleeve === "core-quality") {
      if (h.peRatio > 40) {
        score -= 10;
        reasoning.push(`P/E elevated at ${h.peRatio.toFixed(1)}`);
      } else if (h.peRatio < 15 && h.peRatio > 0) {
        score += 10;
        reasoning.push(`P/E attractive at ${h.peRatio.toFixed(1)}`);
      }
    }

    // 5. Smart-money backing (13F conviction)
    const backing = countFundBacking(h.ticker, activities);
    if (backing >= 2) {
      score += backing * 5;
      reasoning.push(`${backing} tracked funds added this quarter`);
    }

    // Determine action
    let action: Recommendation["action"];
    let amountUsd: number | null = null;

    if (score >= 40) {
      action = "buy";
      const gapDollars = Math.max(0, h.targetAmount - h.currentAmount);
      amountUsd = Math.min(gapDollars, cashAvailable) || Math.min(50, cashAvailable);
      priority = score >= 60 ? "high" : "medium";
    } else if (score <= -40) {
      action = "sell";
      amountUsd = h.currentAmount - h.targetAmount;
      priority = score <= -60 ? "high" : "medium";
    } else if (score >= 15) {
      action = "watch";
      priority = "low";
      reasoning.push("Signals present but below buy threshold");
    } else if (score <= -15) {
      action = "watch";
      priority = "low";
      reasoning.push("Signals present but below trim threshold");
    } else {
      action = "hold";
      priority = "low";
      if (reasoning.length === 0) reasoning.push("On target, no notable signals");
    }

    recs.push({
      id: `rec-${h.ticker}`,
      priority,
      action,
      ticker: h.ticker,
      amountUsd,
      reasoning,
      confidence: Math.min(100, Math.abs(score)),
    });
  }

  // Sort: high priority first, then by action (buy>sell>watch>hold), then by confidence
  const priorityRank: Record<Recommendation["priority"], number> = { high: 0, medium: 1, low: 2 };
  const actionRank: Record<Recommendation["action"], number> = { buy: 0, sell: 1, watch: 2, hold: 3 };

  return recs.sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    if (actionRank[a.action] !== actionRank[b.action]) {
      return actionRank[a.action] - actionRank[b.action];
    }
    return b.confidence - a.confidence;
  });
}
