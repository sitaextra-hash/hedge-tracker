import { sql } from "@vercel/postgres";

export type DbHolding = {
  ticker: string;
  shares: number;
  avgCost: number;
  updatedAt: string;
};

export type DbTransaction = {
  id: number;
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  amount: number;
  executedAt: string;
  note: string | null;
};

let initialized = false;

async function ensureSchema(): Promise<void> {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS holdings (
      ticker VARCHAR(10) PRIMARY KEY,
      shares NUMERIC(20, 8) NOT NULL DEFAULT 0,
      avg_cost NUMERIC(20, 4) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      ticker VARCHAR(10) NOT NULL,
      action VARCHAR(10) NOT NULL,
      shares NUMERIC(20, 8) NOT NULL,
      price NUMERIC(20, 4) NOT NULL,
      amount NUMERIC(20, 2) NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      note TEXT
    );
  `;
  initialized = true;
}

export function isDbConfigured(): boolean {
  return !!process.env.POSTGRES_URL;
}

export async function getAllHoldings(): Promise<DbHolding[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
    const { rows } = await sql`SELECT ticker, shares, avg_cost, updated_at FROM holdings`;
    return rows.map((r) => ({
      ticker: r.ticker,
      shares: Number(r.shares),
      avgCost: Number(r.avg_cost),
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    console.error("getAllHoldings error:", err);
    return [];
  }
}

export async function getRecentTransactions(limit = 25): Promise<DbTransaction[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT id, ticker, action, shares, price, amount, executed_at, note
      FROM transactions
      ORDER BY executed_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      ticker: r.ticker,
      action: r.action as "buy" | "sell",
      shares: Number(r.shares),
      price: Number(r.price),
      amount: Number(r.amount),
      executedAt: r.executed_at,
      note: r.note,
    }));
  } catch (err) {
    console.error("getRecentTransactions error:", err);
    return [];
  }
}

export type RecordTradeInput = {
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  note?: string;
};

export async function recordTrade(input: RecordTradeInput): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    return { success: false, error: "Database not configured" };
  }
  try {
    await ensureSchema();
    const amount = input.shares * input.price;
    const signedShares = input.action === "buy" ? input.shares : -input.shares;

    // Insert transaction
    await sql`
      INSERT INTO transactions (ticker, action, shares, price, amount, note)
      VALUES (${input.ticker}, ${input.action}, ${input.shares}, ${input.price}, ${amount}, ${input.note ?? null})
    `;

    // Upsert holding — for buy, blend avg cost; for sell, keep avg cost
    if (input.action === "buy") {
      await sql`
        INSERT INTO holdings (ticker, shares, avg_cost, updated_at)
        VALUES (${input.ticker}, ${input.shares}, ${input.price}, NOW())
        ON CONFLICT (ticker) DO UPDATE SET
          shares = holdings.shares + EXCLUDED.shares,
          avg_cost = (holdings.shares * holdings.avg_cost + EXCLUDED.shares * EXCLUDED.avg_cost)
                     / NULLIF(holdings.shares + EXCLUDED.shares, 0),
          updated_at = NOW()
      `;
    } else {
      await sql`
        INSERT INTO holdings (ticker, shares, avg_cost, updated_at)
        VALUES (${input.ticker}, ${signedShares}, ${input.price}, NOW())
        ON CONFLICT (ticker) DO UPDATE SET
          shares = holdings.shares + ${signedShares},
          updated_at = NOW()
      `;
    }

    return { success: true };
  } catch (err) {
    console.error("recordTrade error:", err);
    return { success: false, error: String(err) };
  }
}

export async function resetHoldings(): Promise<void> {
  if (!isDbConfigured()) return;
  await ensureSchema();
  await sql`DELETE FROM holdings`;
  await sql`DELETE FROM transactions`;
}
