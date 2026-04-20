"use client";
import { Holding } from "@/lib/mockData";

const SECTOR_MAP: Record<string, string> = {
  VOO: "US Equity",
  QQQ: "US Equity",
  VXUS: "Intl Equity",
  "BRK.B": "Value",
  GOOGL: "Tech",
  MA: "Financials",
  BN: "Alternatives",
  SHLD: "Defense",
  XLE: "Energy",
  SMH: "Semis/AI",
};

const SECTOR_COLOR: Record<string, string> = {
  "US Equity":   "bg-blue-600",
  "Intl Equity": "bg-indigo-600",
  "Value":       "bg-purple-600",
  "Tech":        "bg-cyan-600",
  "Financials":  "bg-teal-600",
  "Alternatives":"bg-violet-600",
  "Defense":     "bg-orange-600",
  "Energy":      "bg-yellow-600",
  "Semis/AI":    "bg-emerald-600",
};

export default function SectorPanel({ holdings }: { holdings: Holding[] }) {
  const sectorMap = new Map<string, number>();
  const total = holdings.reduce((s, h) => s + h.currentAmount, 0);

  holdings.forEach((h) => {
    const sector = SECTOR_MAP[h.ticker] ?? "Other";
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + h.currentAmount);
  });

  const sectors = Array.from(sectorMap.entries())
    .map(([name, amount]) => ({ name, amount, pct: (amount / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-4">Sector Exposure</h2>
      <div className="space-y-3">
        {sectors.map(({ name, amount, pct }) => (
          <div key={name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">{name}</span>
              <span className="text-gray-400 font-mono">{pct.toFixed(1)}% · ${amount.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${SECTOR_COLOR[name] ?? "bg-gray-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
