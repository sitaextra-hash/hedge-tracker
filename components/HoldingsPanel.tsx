"use client";
import type { ComputedHolding } from "@/lib/portfolio";

const sleeveLabel: Record<ComputedHolding["sleeve"], string> = {
  "core-broad":   "Core · Broad",
  "core-quality": "Core · Quality",
  "speculation":  "Speculation",
  "cash":         "Cash",
};

const sleeveColor: Record<ComputedHolding["sleeve"], string> = {
  "core-broad":   "text-blue-400",
  "core-quality": "text-indigo-400",
  "speculation":  "text-amber-400",
  "cash":         "text-gray-400",
};

function DriftBadge({ drift }: { drift: number }) {
  const abs = Math.abs(drift);
  const warn = abs >= 2;
  const color = warn ? "bg-yellow-900 text-yellow-300" : "bg-gray-800 text-gray-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono ${color}`}>
      {drift > 0 ? "+" : ""}{drift.toFixed(1)}%
    </span>
  );
}

function RangeBar({ pos, low, high, price }: { pos: number | null; low: number | null; high: number | null; price: number }) {
  if (pos === null || low === null || high === null) return <span className="text-gray-700 text-xs">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-[120px]" title={`52w range $${low.toFixed(2)} – $${high.toFixed(2)} · Current $${price.toFixed(2)}`}>
      <span className="text-[10px] text-gray-600 font-mono w-10 text-right">${low.toFixed(0)}</span>
      <div className="relative flex-1 h-1.5 bg-gray-800 rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-sm bg-cyan-400"
          style={{ left: `${Math.min(100, Math.max(0, pos))}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>
      <span className="text-[10px] text-gray-600 font-mono w-10">${high.toFixed(0)}</span>
    </div>
  );
}

export default function HoldingsPanel({ holdings }: { holdings: ComputedHolding[] }) {
  const totalCurrent = holdings.reduce((s, h) => s + h.currentAmount, 0);
  const totalTarget = holdings.reduce((s, h) => s + h.targetAmount, 0);
  const totalPnl = totalCurrent - totalTarget;
  const totalPnlPct = totalTarget > 0 ? (totalPnl / totalTarget) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Holdings</h2>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span className="text-2xl font-mono font-semibold text-white">
              ${totalCurrent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-sm font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(0)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-[10px] uppercase border-b border-gray-800">
              <th className="text-left pb-2 pr-3">Ticker</th>
              <th className="text-left pb-2 pr-3">Sleeve</th>
              <th className="text-right pb-2 pr-3">Price</th>
              <th className="text-right pb-2 pr-3">Value</th>
              <th className="text-right pb-2 pr-3">Drift</th>
              <th className="text-right pb-2 pr-3">1W</th>
              <th className="text-right pb-2 pr-3">P/E</th>
              <th className="text-right pb-2 pr-3">Div</th>
              <th className="text-center pb-2">52W Range</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {holdings.map((h) => (
              <tr key={h.ticker} className="hover:bg-gray-800/50 transition-colors">
                <td className="py-2.5 pr-3 font-mono font-semibold">{h.ticker}</td>
                <td className={`py-2.5 pr-3 text-xs ${sleeveColor[h.sleeve]}`}>{sleeveLabel[h.sleeve]}</td>
                <td className="py-2.5 pr-3 text-right font-mono">${h.currentPrice.toFixed(2)}</td>
                <td className="py-2.5 pr-3 text-right font-mono">${h.currentAmount.toFixed(0)}</td>
                <td className="py-2.5 pr-3 text-right"><DriftBadge drift={h.drift} /></td>
                <td className={`py-2.5 pr-3 text-right font-mono text-xs ${
                  h.weekChangePct === null ? "text-gray-700" :
                  h.weekChangePct >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {h.weekChangePct === null ? "—" : `${h.weekChangePct >= 0 ? "+" : ""}${h.weekChangePct.toFixed(1)}%`}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-xs text-gray-400">
                  {h.peRatio ? h.peRatio.toFixed(1) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-xs text-gray-400">
                  {h.dividendYield ? `${h.dividendYield.toFixed(1)}%` : "—"}
                </td>
                <td className="py-2.5">
                  <RangeBar pos={h.fiftyTwoWeekPosition} low={h.fiftyTwoWeekLow} high={h.fiftyTwoWeekHigh} price={h.currentPrice} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Prices delayed ~15 min · P/E and 52W range from Yahoo Finance · Cyan mark shows current price position in range
      </p>
    </div>
  );
}
