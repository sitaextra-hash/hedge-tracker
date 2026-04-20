"use client";
import { Holding } from "@/lib/mockData";

const sleeveLabel: Record<Holding["sleeve"], string> = {
  "core-broad": "Core · Broad",
  "core-quality": "Core · Quality",
  "speculation": "Speculation",
  "cash": "Cash",
};

const sleeveColor: Record<Holding["sleeve"], string> = {
  "core-broad": "text-blue-400",
  "core-quality": "text-indigo-400",
  "speculation": "text-amber-400",
  "cash": "text-gray-400",
};

function DriftBadge({ drift }: { drift: number }) {
  const abs = Math.abs(drift);
  const warn = abs >= 2;
  const color = warn
    ? drift > 0 ? "bg-yellow-900 text-yellow-300" : "bg-yellow-900 text-yellow-300"
    : "bg-gray-800 text-gray-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono ${color}`}>
      {drift > 0 ? "+" : ""}{drift.toFixed(1)}%
    </span>
  );
}

export default function HoldingsPanel({ holdings }: { holdings: Holding[] }) {
  const totalCurrent = holdings.reduce((s, h) => s + h.currentAmount, 0);

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <span className="text-sm text-gray-400">
          Portfolio value: <span className="text-white font-mono">${totalCurrent.toLocaleString()}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left pb-2 pr-4">Ticker</th>
              <th className="text-left pb-2 pr-4">Sleeve</th>
              <th className="text-right pb-2 pr-4">Price</th>
              <th className="text-right pb-2 pr-4">Value</th>
              <th className="text-right pb-2 pr-4">Target %</th>
              <th className="text-right pb-2 pr-4">Current %</th>
              <th className="text-right pb-2">Drift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {holdings.map((h) => (
              <tr key={h.ticker} className="hover:bg-gray-800/50 transition-colors">
                <td className="py-2.5 pr-4 font-mono font-semibold">{h.ticker}</td>
                <td className={`py-2.5 pr-4 text-xs ${sleeveColor[h.sleeve]}`}>{sleeveLabel[h.sleeve]}</td>
                <td className="py-2.5 pr-4 text-right font-mono">${h.currentPrice.toFixed(2)}</td>
                <td className="py-2.5 pr-4 text-right font-mono">${h.currentAmount.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-right text-gray-400">{h.targetPct.toFixed(1)}%</td>
                <td className="py-2.5 pr-4 text-right">{h.currentPct.toFixed(1)}%</td>
                <td className="py-2.5 text-right"><DriftBadge drift={h.drift} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-3">Prices delayed ~15 min · Target allocation based on $2,000 portfolio</p>
    </div>
  );
}
