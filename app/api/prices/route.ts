import { NextResponse } from "next/server";
import { fetchPrices } from "@/lib/prices";
import { getAllTickers } from "@/lib/portfolio";

export const dynamic = "force-dynamic";
export const revalidate = 900; // 15 min

export async function GET() {
  try {
    const tickers = getAllTickers();
    const prices = await fetchPrices(tickers);
    const payload = Object.fromEntries(prices.entries());
    return NextResponse.json({ prices: payload, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("prices route error:", err);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
