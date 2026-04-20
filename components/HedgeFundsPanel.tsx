"use client";
import type { FundActivity } from "@/lib/edgar";

type Action = FundActivity["action"];

const actionStyles: Record<Action, string> = {
  new:  "bg-green-900/60 text-green-300",
  add:  "bg-blue-900/60 text-blue-300",
  trim: "bg-yellow-900/60 text-yellow-300",
  exit: "bg-red-900/60 text-red-300",
  hold: "bg-gray-800 text-gray-500",
};

function formatValue(thousands: number) {
  const v = thousands * 1000;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

export default function HedgeFundsPanel({
  activities,
  fetchedAt,
  fundsProcessed,
  error,
}: {
  activities: FundActivity[];
  fetchedAt?: string;
  fundsProcessed?: number;
  error?: string;
}) {
  // Only show meaningful moves: new, add (>20%), trim (>20%), exit
  const notable = activities.filter(
    (a) =>
      a.action === "new" ||
      a.action === "exit" ||
      Math.abs(a.changePct) >= 20
  );

  // Sort: new first, then by value; cap at 50 rows
  const sorted = [...notable].sort((a, b) => {
    const order: Record<Action, number> = { new: 0, exit: 1, add: 2, trim: 3, hold: 4 };
    if (order[a.action] !== order[b.action]) return order[a.action] - order[b.action];
    return b.valueThousands - a.valueThousands;
  }).slice(0, 50);

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">13F Filings</h2>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          45-day filing lag
          <span
            className="cursor-help"
            title="13F filings are due 45 days after quarter end. Data reflects fund positions as of quarter-end, not today."
          >ⓘ</span>
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        US hedge funds managing over $100M must file 13F forms with the SEC each quarter, disclosing their US equity holdings.
        This shows <span className="text-gray-400">notable moves</span> — new positions, exits, and changes &gt;20% — from the 13 funds tracked.
        Use as a conviction signal, not a real-time feed.
      </p>
      {fundsProcessed !== undefined && (
        <p className="text-xs text-gray-600 mb-4">
          {fundsProcessed}/13 funds loaded · Top 50 moves by value
          {fetchedAt && ` · Updated ${new Date(fetchedAt).toLocaleDateString()}`}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 py-4">{error}</p>
      )}

      {!error && sorted.length === 0 && (
        <p className="text-sm text-gray-500 py-4">
          No notable moves this quarter. All tracked funds held positions steady.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                <th className="text-left pb-2 pr-3">Action</th>
                <th className="text-left pb-2 pr-3">Issuer</th>
                <th className="text-left pb-2 pr-3">Fund</th>
                <th className="text-right pb-2 pr-3">Change</th>
                <th className="text-right pb-2 pr-3">Value</th>
                <th className="text-right pb-2">Filed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sorted.map((a, i) => (
                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                  <td className="py-2.5 pr-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${actionStyles[a.action]}`}>
                      {a.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 max-w-[180px] truncate text-gray-200">{a.issuer}</td>
                  <td className="py-2.5 pr-3 text-gray-400 text-xs">{a.fund}</td>
                  <td className={`py-2.5 pr-3 text-right font-mono text-sm ${a.changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {a.changePct > 0 ? "+" : ""}{a.changePct}%
                  </td>
                  <td className="py-2.5 pr-3 text-right text-gray-400 font-mono text-xs">
                    {a.action === "exit" ? "—" : formatValue(a.valueThousands)}
                  </td>
                  <td className="py-2.5 text-right text-xs text-gray-600">{a.filedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
