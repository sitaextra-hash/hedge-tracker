import yahooFinance from "yahoo-finance2";

export type PriceResult = {
  ticker: string;
  price: number;
  previousClose: number;
  weekAgoPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  dividendYield: number | null; // as percentage (e.g. 1.5 = 1.5%)
  source: "stooq" | "yahoo";
};

async function fetchStooq(ticker: string): Promise<number | null> {
  // BRK.B is listed as BRK-B on stooq
  const stooqTicker = ticker.replace(".", "-").toLowerCase();
  const url = `https://stooq.com/q/l/?s=${stooqTicker}.us&f=sd2t2ohlcv&h&e=csv`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "hedge-tracker/1.0" },
      next: { revalidate: 900 }, // 15 min cache
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    // CSV: Symbol,Date,Time,Open,High,Low,Close,Volume
    const close = parseFloat(cols[6]);
    return isNaN(close) || close <= 0 ? null : close;
  } catch {
    return null;
  }
}

type YahooMetrics = {
  price: number;
  previousClose: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
};

async function fetchYahoo(ticker: string): Promise<YahooMetrics | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(ticker, {}, { validateResult: false });
    const price = quote.regularMarketPrice ?? null;
    const prev = quote.regularMarketPreviousClose ?? quote.regularMarketPrice ?? null;
    if (!price) return null;

    // Yahoo returns trailingAnnualDividendYield as decimal (0.015 = 1.5%)
    const divYield = quote.trailingAnnualDividendYield ?? quote.dividendYield ?? null;

    return {
      price,
      previousClose: prev ?? price,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
      peRatio: quote.trailingPE ?? null,
      forwardPE: quote.forwardPE ?? null,
      dividendYield: divYield != null ? divYield * 100 : null,
    };
  } catch {
    return null;
  }
}

async function fetchWeekAgoPrice(ticker: string): Promise<number | null> {
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 8); // 8 days back to account for weekends
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: any[] = await yahooFinance.historical(
      ticker,
      { period1: from.toISOString().split("T")[0], period2: to.toISOString().split("T")[0], interval: "1d" },
      { validateResult: false }
    );
    if (!history || history.length < 2) return null;
    // history is sorted oldest→newest; take the oldest entry as ~7 days ago
    return history[0]?.close ?? null;
  } catch {
    return null;
  }
}

export async function fetchPrice(ticker: string): Promise<PriceResult | null> {
  const [stooqPrice, yahoo, weekAgoPrice] = await Promise.all([
    fetchStooq(ticker),
    fetchYahoo(ticker).catch(() => null),
    fetchWeekAgoPrice(ticker).catch(() => null),
  ]);

  if (stooqPrice) {
    return {
      ticker,
      price: stooqPrice,
      previousClose: yahoo?.previousClose ?? stooqPrice,
      weekAgoPrice,
      fiftyTwoWeekHigh: yahoo?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: yahoo?.fiftyTwoWeekLow ?? null,
      peRatio: yahoo?.peRatio ?? null,
      forwardPE: yahoo?.forwardPE ?? null,
      dividendYield: yahoo?.dividendYield ?? null,
      source: "stooq",
    };
  }

  if (yahoo) {
    return {
      ticker,
      price: yahoo.price,
      previousClose: yahoo.previousClose,
      weekAgoPrice,
      fiftyTwoWeekHigh: yahoo.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: yahoo.fiftyTwoWeekLow,
      peRatio: yahoo.peRatio,
      forwardPE: yahoo.forwardPE,
      dividendYield: yahoo.dividendYield,
      source: "yahoo",
    };
  }

  return null;
}

export async function fetchPrices(tickers: string[]): Promise<Map<string, PriceResult>> {
  const results = await Promise.allSettled(tickers.map((t) => fetchPrice(t)));
  const map = new Map<string, PriceResult>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      map.set(tickers[i], r.value);
    }
  });
  return map;
}
