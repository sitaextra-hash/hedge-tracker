import { NextResponse } from "next/server";
import { fetchPrices } from "@/lib/prices";
import { getAllTickers } from "@/lib/portfolio";
import { getPortfolioHoldings, computeHoldings } from "@/lib/portfolio";
import { fetchFund13F, diffFilings } from "@/lib/edgar";
import { computeAlerts } from "@/lib/alerts";
import portfolioConfig from "@/config/portfolio.json";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export async function GET() {
  try {
    const [prices, filingsResults] = await Promise.all([
      fetchPrices(getAllTickers()),
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

    const activities = filingsResults.flatMap((r, i) => {
      if (r.status !== "fulfilled" || !r.value.current) return [];
      const { current, previous } = r.value;
      return diffFilings(portfolioConfig.hedgeFunds[i].name, portfolioConfig.hedgeFunds[i].cik, current, previous);
    });

    const alerts = computeAlerts(
      computed,
      prices,
      activities,
      portfolioConfig.thesisTickers
    );

    return NextResponse.json({ alerts, computedAt: new Date().toISOString() });
  } catch (err) {
    console.error("alerts route error:", err);
    return NextResponse.json({ error: "Failed to compute alerts" }, { status: 500 });
  }
}
