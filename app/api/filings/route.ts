import { NextResponse } from "next/server";
import { fetchFund13F, diffFilings } from "@/lib/edgar";
import portfolioConfig from "@/config/portfolio.json";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // 24h — filings are quarterly

export async function GET() {
  try {
    const funds = portfolioConfig.hedgeFunds;

    // Fetch all funds in parallel, max 10 req/sec — with 13 funds and async this is fine
    const results = await Promise.allSettled(
      funds.map((f) => fetchFund13F(f.name, f.cik))
    );

    const activities = results.flatMap((r, i) => {
      if (r.status !== "fulfilled" || !r.value.current) return [];
      const { current, previous } = r.value;
      return diffFilings(funds[i].name, funds[i].cik, current, previous);
    });

    return NextResponse.json({
      activities,
      fetchedAt: new Date().toISOString(),
      fundsProcessed: results.filter((r) => r.status === "fulfilled" && r.value.current).length,
    });
  } catch (err) {
    console.error("filings route error:", err);
    return NextResponse.json({ error: "Failed to fetch filings" }, { status: 500 });
  }
}
