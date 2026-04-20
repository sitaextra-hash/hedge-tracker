import HoldingsPanel from "@/components/HoldingsPanel";
import AlertsPanel from "@/components/AlertsPanel";
import HedgeFundsPanel from "@/components/HedgeFundsPanel";
import SectorPanel from "@/components/SectorPanel";
import ThesisTrackerPanel from "@/components/ThesisTrackerPanel";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import TransactionHistory from "@/components/TransactionHistory";
import ProgressChart, { type ChartSeries } from "@/components/ProgressChart";
import { fetchPrices, fetchHistories, type HistoryPoint } from "@/lib/prices";
import { getPortfolioHoldings, computeHoldings, getAllTickers } from "@/lib/portfolio";
import { fetchFund13F, diffFilings } from "@/lib/edgar";
import { computeAlerts } from "@/lib/alerts";
import { computeRecommendations } from "@/lib/recommendations";
import { getAllHoldings, getRecentTransactions, isDbConfigured } from "@/lib/db";
import portfolioConfig from "@/config/portfolio.json";
import type { ThesisTicker } from "@/lib/mockData";
import type { FundActivity } from "@/lib/edgar";

export const revalidate = 900;

export default async function Dashboard() {
  const portfolioTickers = portfolioConfig.holdings.map((h) => h.ticker);
  const [prices, filingsResults, dbHoldings, dbTransactions, histories] = await Promise.all([
    fetchPrices(getAllTickers()).catch(() => new Map()),
    Promise.allSettled(
      portfolioConfig.hedgeFunds.map((f) => fetchFund13F(f.name, f.cik))
    ),
    getAllHoldings().catch(() => []),
    getRecentTransactions(25).catch(() => []),
    fetchHistories(portfolioTickers, 6).catch(() => new Map<string, HistoryPoint[]>()),
  ]);

  const portfolioHoldings = getPortfolioHoldings();
  const dbSharesByTicker = new Map(dbHoldings.map((h) => [h.ticker, h.shares]));

  const sharesOwned: Record<string, number> = {};
  portfolioHoldings.forEach((h) => {
    const fromDb = dbSharesByTicker.get(h.ticker);
    if (fromDb !== undefined && fromDb > 0) {
      sharesOwned[h.ticker] = fromDb;
      return;
    }
    const p = prices.get(h.ticker)?.price;
    sharesOwned[h.ticker] = p && p > 0 ? h.targetAmount / p : 0;
  });
  const computed = computeHoldings(portfolioHoldings, prices, sharesOwned);

  const thesisTickers: ThesisTicker[] = portfolioConfig.thesisTickers.map((ticker) => {
    const p = prices.get(ticker);
    return {
      ticker,
      name: ticker,
      price: p?.price ?? 0,
      weekChangePct: p?.weekAgoPrice && p.weekAgoPrice > 0
        ? ((p.price - p.weekAgoPrice) / p.weekAgoPrice) * 100
        : 0,
    };
  });

  const fundsProcessed = filingsResults.filter(
    (r) => r.status === "fulfilled" && r.value.current
  ).length;

  const activities: FundActivity[] = filingsResults.flatMap((r, i) => {
    if (r.status !== "fulfilled" || !r.value.current) return [];
    const { current, previous } = r.value;
    return diffFilings(portfolioConfig.hedgeFunds[i].name, portfolioConfig.hedgeFunds[i].cik, current, previous);
  });

  const alerts = computeAlerts(computed, prices, activities, portfolioConfig.thesisTickers);
  const recommendations = computeRecommendations(computed, activities, portfolioConfig.cashTargetAmount);

  const priceMap: Record<string, number> = {};
  computed.forEach((h) => { priceMap[h.ticker] = h.currentPrice; });

  // Build progress chart series: per-ticker value (shares × historical close) and overall sum.
  const perTicker: ChartSeries[] = [];
  const dateUnion = new Set<string>();
  for (const h of computed) {
    const hist = histories.get(h.ticker);
    if (!hist || hist.length < 2) continue;
    const points = hist.map((p) => {
      dateUnion.add(p.date);
      return { date: p.date, value: p.close * h.shares };
    });
    perTicker.push({ key: h.ticker, label: h.ticker, points });
  }
  const sortedDates = Array.from(dateUnion).sort();
  const lastCloseByTicker = new Map<string, Map<string, number>>();
  for (const h of computed) {
    const hist = histories.get(h.ticker);
    if (!hist) continue;
    const m = new Map<string, number>();
    let lastClose = hist[0]?.close ?? 0;
    const byDate = new Map(hist.map((p) => [p.date, p.close]));
    for (const d of sortedDates) {
      const c = byDate.get(d);
      if (c !== undefined) lastClose = c;
      m.set(d, lastClose);
    }
    lastCloseByTicker.set(h.ticker, m);
  }
  const overallPoints = sortedDates.map((date) => {
    let value = 0;
    for (const h of computed) {
      const c = lastCloseByTicker.get(h.ticker)?.get(date);
      if (c) value += c * h.shares;
    }
    return { date, value };
  });
  const chartSeries: ChartSeries[] = [
    { key: "overall", label: "Overall portfolio", points: overallPoints },
    ...perTicker,
  ];

  const hasPrices = prices.size > 0;
  const fetchedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const dbReady = isDbConfigured();
  const tradeCount = dbTransactions.length;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hedge Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasPrices
              ? `Prices as of ${fetchedAt} ET · ~15 min delay`
              : "Price data unavailable — check back shortly"}
            {dbReady && tradeCount > 0 && ` · ${tradeCount} recorded trade${tradeCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!dbReady && (
            <div className="text-xs text-amber-400 bg-amber-900/40 px-3 py-1 rounded-full">
              DB not configured — trades won't persist
            </div>
          )}
          {!hasPrices && (
            <div className="text-xs text-yellow-400 bg-yellow-900/40 px-3 py-1 rounded-full">
              Prices unavailable
            </div>
          )}
        </div>
      </div>

      {/* Holdings + Sector at the top */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <HoldingsPanel holdings={computed} />
        </div>
        <div>
          <SectorPanel holdings={computed} />
        </div>
      </div>

      {/* Progress chart — overall or per-ticker */}
      <ProgressChart series={chartSeries} />

      {/* Suggested actions — synthesized from all data */}
      <RecommendationsPanel recommendations={recommendations} prices={priceMap} />

      {/* Transaction history — real trades recorded via Execute */}
      <TransactionHistory transactions={dbTransactions} />

      {/* Alerts — compact */}
      <AlertsPanel alerts={alerts} />

      <HedgeFundsPanel
        activities={activities}
        fetchedAt={new Date().toISOString()}
        fundsProcessed={fundsProcessed}
      />

      <ThesisTrackerPanel tickers={thesisTickers} />

      <footer className="text-center text-xs text-gray-700 pt-4 border-t border-gray-800">
        Not investment advice. Educational tool. Verify all data independently.
      </footer>
    </main>
  );
}
