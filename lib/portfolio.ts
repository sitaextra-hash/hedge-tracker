import portfolioConfig from "@/config/portfolio.json";
import type { PriceResult } from "./prices";

export type PortfolioHolding = {
  ticker: string;
  targetPct: number;
  targetAmount: number;
  sleeve: "core-broad" | "core-quality" | "speculation" | "cash";
};

export type ComputedHolding = PortfolioHolding & {
  currentPrice: number;
  previousClose: number;
  weekAgoPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekPosition: number | null; // 0..100, where 0=at low, 100=at high
  peRatio: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  weekChangePct: number | null;
  shares: number;
  currentAmount: number;
  currentPct: number;
  drift: number;
  dayChangePct: number;
  priceSource: "stooq" | "yahoo" | "unavailable";
};

const SLEEVE_MAP: Record<string, PortfolioHolding["sleeve"]> = {
  VOO: "core-broad", QQQ: "core-broad", VXUS: "core-broad",
  "BRK.B": "core-quality", GOOGL: "core-quality", MA: "core-quality", BN: "core-quality",
  SHLD: "speculation", XLE: "speculation", SMH: "speculation",
};

export function getPortfolioHoldings(): PortfolioHolding[] {
  return portfolioConfig.holdings.map((h) => ({
    ticker: h.ticker,
    targetPct: h.targetPct,
    targetAmount: h.targetAmount,
    sleeve: SLEEVE_MAP[h.ticker] ?? "core-broad",
  }));
}

export function computeHoldings(
  holdings: PortfolioHolding[],
  prices: Map<string, PriceResult>,
  sharesOwned: Record<string, number>,
): ComputedHolding[] {
  const computed = holdings.map((h) => {
    const price = prices.get(h.ticker);
    const shares = sharesOwned[h.ticker] ?? h.targetAmount / (price?.price ?? 1);
    const currentPrice = price?.price ?? 0;
    const currentAmount = currentPrice * shares;
    const high = price?.fiftyTwoWeekHigh ?? null;
    const low = price?.fiftyTwoWeekLow ?? null;
    const pos =
      high && low && high > low
        ? ((currentPrice - low) / (high - low)) * 100
        : null;
    const weekChangePct =
      price?.weekAgoPrice && price.weekAgoPrice > 0
        ? ((currentPrice - price.weekAgoPrice) / price.weekAgoPrice) * 100
        : null;
    return {
      ...h,
      currentPrice,
      previousClose: price?.previousClose ?? currentPrice,
      weekAgoPrice: price?.weekAgoPrice ?? null,
      fiftyTwoWeekHigh: high,
      fiftyTwoWeekLow: low,
      fiftyTwoWeekPosition: pos,
      peRatio: price?.peRatio ?? null,
      forwardPE: price?.forwardPE ?? null,
      dividendYield: price?.dividendYield ?? null,
      weekChangePct,
      shares,
      currentAmount,
      priceSource: price?.source ?? ("unavailable" as const),
      currentPct: 0,
      drift: 0,
      dayChangePct: 0,
    };
  });

  const totalValue = computed.reduce((s, h) => s + h.currentAmount, 0);

  return computed.map((h) => {
    const currentPct = totalValue > 0 ? (h.currentAmount / totalValue) * 100 : 0;
    const drift = currentPct - h.targetPct;
    const dayChangePct = h.previousClose > 0 ? ((h.currentPrice - h.previousClose) / h.previousClose) * 100 : 0;
    return { ...h, currentPct, drift, dayChangePct };
  });
}

export function getAllTickers(): string[] {
  return [
    ...portfolioConfig.holdings.map((h) => h.ticker),
    ...portfolioConfig.thesisTickers,
  ];
}
