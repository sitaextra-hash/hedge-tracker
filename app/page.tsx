import HoldingsPanel from "@/components/HoldingsPanel";
import AlertsPanel from "@/components/AlertsPanel";
import HedgeFundsPanel from "@/components/HedgeFundsPanel";
import SectorPanel from "@/components/SectorPanel";
import ThesisTrackerPanel from "@/components/ThesisTrackerPanel";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import { fetchPrices } from "@/lib/prices";
import { getPortfolioHoldings, computeHoldings, getAllTickers } from "@/lib/portfolio";
import { fetchFund13F, diffFilings } from "@/lib/edgar";
import { computeAlerts } from "@/lib/alerts";
import { computeRecommendations } from "@/lib/recommendations";
import portfolioConfig from "@/config/portfolio.json";
import type { ThesisTicker } from "@/lib/mockData";
import type { FundActivity } from "@/lib/edgar";

export const revalidate = 900;

export default async function Dashboard() {
  const [prices, filingsResults] = await Promise.all([
    fetchPrices(getAllTickers()).catch(() => new Map()),
    Promise.allSettled(
      portfolioConfig.hedgeFunds.map((f) => fetchFund13F(f.name, f.cik))
    ),
  ]);

  const portfolioHoldings = getPortfolioHoldings();
  const sharesOwned: Record<string, number> = {};
  portfolioHoldings.forEach((h) => {
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

  const hasPrices = prices.size > 0;
  const fetchedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hedge Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasPrices
              ? `Prices as of ${fetchedAt} ET · ~15 min delay`
              : "Price data unavailable — check back shortly"}
          </p>
        </div>
        {!hasPrices && (
          <div className="text-xs text-yellow-400 bg-yellow-900/40 px-3 py-1 rounded-full">
            Prices unavailable
          </div>
        )}
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

      {/* Suggested actions — synthesized from all data */}
      <RecommendationsPanel recommendations={recommendations} />

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
