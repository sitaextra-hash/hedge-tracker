import { NextRequest, NextResponse } from "next/server";
import { fetchPrices } from "@/lib/prices";
import { getPortfolioHoldings, computeHoldings, getAllTickers } from "@/lib/portfolio";
import { fetchFund13F, diffFilings } from "@/lib/edgar";
import { computeAlerts } from "@/lib/alerts";
import { sendWeeklyDigest } from "@/lib/email";
import portfolioConfig from "@/config/portfolio.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron (or by us in dev)
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) {
    return NextResponse.json({ error: "ALERT_EMAIL not set" }, { status: 500 });
  }

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

    const alerts = computeAlerts(computed, prices, activities, portfolioConfig.thesisTickers);
    const result = await sendWeeklyDigest(alerts, alertEmail);

    return NextResponse.json({
      ok: result.success,
      alertCount: alerts.length,
      emailSent: alerts.length > 0,
      error: result.error,
    });
  } catch (err) {
    console.error("cron error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
