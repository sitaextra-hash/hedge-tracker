"use client";
import type { Recommendation } from "@/lib/recommendations";

const actionStyles: Record<Recommendation["action"], { bg: string; text: string; border: string }> = {
  buy:   { bg: "bg-green-900/40",  text: "text-green-300",  border: "border-green-700/50" },
  sell:  { bg: "bg-red-900/40",    text: "text-red-300",    border: "border-red-700/50" },
  watch: { bg: "bg-blue-900/40",   text: "text-blue-300",   border: "border-blue-700/50" },
  hold:  { bg: "bg-gray-800/40",   text: "text-gray-400",   border: "border-gray-700/50" },
};

const priorityDot: Record<Recommendation["priority"], string> = {
  high:   "bg-red-400",
  medium: "bg-yellow-400",
  low:    "bg-gray-500",
};

export default function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const actionable = recommendations.filter((r) => r.action === "buy" || r.action === "sell");
  const watch = recommendations.filter((r) => r.action === "watch");
  const hold = recommendations.filter((r) => r.action === "hold");

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Suggested Actions</h2>
        <span className="text-xs text-gray-500">
          {actionable.length} actionable · {watch.length} watch · {hold.length} hold
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Synthesizes drift, short-term drawdowns, 52-week position, valuation, and 13F smart-money backing
        into a single action per holding. Confidence = aggregated signal strength. Always verify before executing.
      </p>

      {actionable.length === 0 && (
        <p className="text-sm text-gray-500 mb-4">No strong buy/sell signals this week — portfolio is on target.</p>
      )}

      <div className="space-y-2">
        {recommendations.map((r) => {
          const s = actionStyles[r.action];
          const isActionable = r.action === "buy" || r.action === "sell";
          return (
            <div
              key={r.id}
              className={`border ${s.border} rounded-lg px-4 py-3 ${isActionable ? s.bg : "bg-gray-800/20"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot[r.priority]}`} title={`${r.priority} priority`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${s.text} ${s.bg}`}>
                      {r.action}
                    </span>
                    <span className="font-mono font-bold text-white">{r.ticker}</span>
                    {r.amountUsd !== null && r.amountUsd > 0 && (
                      <span className="text-sm font-mono text-gray-300">
                        ~${r.amountUsd.toFixed(0)}
                      </span>
                    )}
                    <span className="text-xs text-gray-600 ml-auto">
                      confidence {r.confidence}%
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {r.reasoning.map((reason, i) => (
                      <li key={i} className="text-xs text-gray-400 flex gap-1.5">
                        <span className="text-gray-700">·</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-700 mt-4 italic">
        Not financial advice. Execute trades manually through your brokerage after your own research.
      </p>
    </div>
  );
}
