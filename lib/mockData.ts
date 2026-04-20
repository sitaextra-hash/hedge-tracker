export type Holding = {
  ticker: string;
  targetPct: number;
  currentPct: number;
  targetAmount: number;
  currentAmount: number;
  currentPrice: number;
  shares: number;
  drift: number;
  sleeve: "core-broad" | "core-quality" | "speculation" | "cash";
};

export type Alert = {
  id: string;
  type: "drift" | "drawdown" | "hedge-fund" | "conviction" | "major-drawdown" | "ai-thesis" | "cash-deploy";
  severity: "yellow" | "blue" | "green" | "gray" | "red";
  title: string;
  body: string;
  action: string;
  impact: string;
  timestamp: string;
};

export type FundHolding = {
  fund: string;
  ticker: string;
  action: "new" | "add" | "trim" | "exit";
  changePct: number;
  shares: number;
  value: number;
  filedDate: string;
};

export type ThesisTicker = {
  ticker: string;
  name: string;
  price: number;
  weekChangePct: number;
};

export const mockHoldings: Holding[] = [
  { ticker: "VOO",   targetPct: 30.0, currentPct: 32.1, targetAmount: 600,  currentAmount: 641,  currentPrice: 481.23, shares: 1.33, drift:  2.1, sleeve: "core-broad" },
  { ticker: "QQQ",   targetPct: 12.5, currentPct: 11.8, targetAmount: 250,  currentAmount: 235,  currentPrice: 468.75, shares: 0.50, drift: -0.7, sleeve: "core-broad" },
  { ticker: "VXUS",  targetPct:  7.5, currentPct:  7.2, targetAmount: 150,  currentAmount: 144,  currentPrice: 62.10,  shares: 2.32, drift: -0.3, sleeve: "core-broad" },
  { ticker: "BRK.B", targetPct:  7.5, currentPct:  7.8, targetAmount: 150,  currentAmount: 157,  currentPrice: 522.40, shares: 0.30, drift:  0.3, sleeve: "core-quality" },
  { ticker: "GOOGL", targetPct:  7.5, currentPct:  6.1, targetAmount: 150,  currentAmount: 122,  currentPrice: 162.30, shares: 0.75, drift: -1.4, sleeve: "core-quality" },
  { ticker: "MA",    targetPct:  7.5, currentPct:  7.9, targetAmount: 150,  currentAmount: 157,  currentPrice: 551.20, shares: 0.29, drift:  0.4, sleeve: "core-quality" },
  { ticker: "BN",    targetPct:  7.5, currentPct:  7.3, targetAmount: 150,  currentAmount: 146,  currentPrice: 58.40,  shares: 2.50, drift: -0.2, sleeve: "core-quality" },
  { ticker: "SHLD",  targetPct:  7.5, currentPct:  5.2, targetAmount: 150,  currentAmount: 104,  currentPrice: 40.10,  shares: 2.59, drift: -2.3, sleeve: "speculation" },
  { ticker: "XLE",   targetPct:  5.0, currentPct:  5.4, targetAmount: 100,  currentAmount: 109,  currentPrice: 83.20,  shares: 1.31, drift:  0.4, sleeve: "speculation" },
  { ticker: "SMH",   targetPct:  2.5, currentPct:  2.3, targetAmount: 50,   currentAmount: 47,   currentPrice: 221.40, shares: 0.21, drift: -0.2, sleeve: "speculation" },
];

export const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "drift",
    severity: "yellow",
    title: "SHLD drifted −2.3% below target",
    body: "Defense ETF has underperformed this week. Current allocation 5.2% vs target 7.5%.",
    action: "Consider adding ~$46 to SHLD to return to target.",
    impact: "Portfolio after action: SHLD 7.5%, total $2,000",
    timestamp: "2026-04-18",
  },
  {
    id: "2",
    type: "hedge-fund",
    severity: "green",
    title: "Pershing Square opened new position in GOOGL",
    body: "Bill Ackman's fund initiated a new position worth $800M in GOOGL (filed 2026-04-01).",
    action: "Your existing GOOGL position aligns with this conviction signal.",
    impact: "No action needed — conviction reinforced",
    timestamp: "2026-04-15",
  },
  {
    id: "3",
    type: "drawdown",
    severity: "blue",
    title: "GOOGL down 11.2% in 7 days",
    body: "Google fell after earnings guidance revision. Down from $182.60 to $162.30.",
    action: "Opportunity to add from cash reserve if conviction unchanged.",
    impact: "Adding $50 from cash: GOOGL allocation → 8.6%, cash → 2.5%",
    timestamp: "2026-04-17",
  },
  {
    id: "4",
    type: "ai-thesis",
    severity: "blue",
    title: "AI Thesis: 4 names up >5% this week",
    body: "NVDA +8.2%, AVGO +6.1%, TSM +5.4%, VRT +5.9% all moved up together.",
    action: "Monitor SMH exposure — this is a correlated move.",
    impact: "No action needed — SMH captures this theme",
    timestamp: "2026-04-18",
  },
];

export const mockFundHoldings: FundHolding[] = [
  { fund: "Pershing Square",   ticker: "GOOGL", action: "new",  changePct: 100, shares: 4200000, value: 800000000, filedDate: "2026-04-01" },
  { fund: "Berkshire Hathaway",ticker: "BRK.B", action: "add",  changePct:   5, shares:  200000, value: 104000000, filedDate: "2026-04-01" },
  { fund: "Akre Capital",      ticker: "MA",    action: "add",  changePct:   8, shares:   90000, value:  49608000, filedDate: "2026-04-01" },
  { fund: "Coatue Management", ticker: "NVDA",  action: "trim", changePct: -22, shares: -800000, value:-176000000, filedDate: "2026-04-01" },
  { fund: "Tiger Global",      ticker: "ASML",  action: "new",  changePct: 100, shares:  110000, value:  77000000, filedDate: "2026-04-01" },
  { fund: "Third Point",       ticker: "GOOGL", action: "add",  changePct:  31, shares:  500000, value:  81150000, filedDate: "2026-04-01" },
];

export const mockThesisTickers: ThesisTicker[] = [
  { ticker: "NVDA", name: "NVIDIA",         price: 873.20, weekChangePct:  8.2 },
  { ticker: "AVGO", name: "Broadcom",       price: 175.40, weekChangePct:  6.1 },
  { ticker: "TSM",  name: "TSMC",           price: 169.80, weekChangePct:  5.4 },
  { ticker: "ASML", name: "ASML",           price: 698.50, weekChangePct:  2.1 },
  { ticker: "VRT",  name: "Vertiv",         price: 92.30,  weekChangePct:  5.9 },
  { ticker: "CEG",  name: "Constellation",  price: 242.10, weekChangePct: -1.3 },
  { ticker: "GEV",  name: "GE Vernova",     price: 334.60, weekChangePct:  3.2 },
  { ticker: "SMCI", name: "Super Micro",    price: 43.20,  weekChangePct: -4.1 },
];
