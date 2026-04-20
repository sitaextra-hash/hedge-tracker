"use client";
import type { Alert } from "@/lib/alerts";

const severityStyles: Record<Alert["severity"], { border: string; badge: string; dot: string }> = {
  yellow: { border: "border-yellow-700/50",  badge: "bg-yellow-900/60 text-yellow-300",   dot: "bg-yellow-400" },
  blue:   { border: "border-blue-700/50",    badge: "bg-blue-900/60 text-blue-300",       dot: "bg-blue-400" },
  green:  { border: "border-green-700/50",   badge: "bg-green-900/60 text-green-300",     dot: "bg-green-400" },
  gray:   { border: "border-gray-700/50",    badge: "bg-gray-800 text-gray-400",          dot: "bg-gray-500" },
  red:    { border: "border-red-700/50",     badge: "bg-red-900/60 text-red-300",         dot: "bg-red-400" },
};

const typeLabel: Record<Alert["type"], string> = {
  "drift": "Drift",
  "drawdown": "Drawdown",
  "hedge-fund": "Hedge Fund",
  "conviction": "Conviction",
  "major-drawdown": "Major Drawdown",
  "ai-thesis": "AI Thesis",
  "cash-deploy": "Cash Deploy",
};

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Alerts</h2>
        <p className="text-gray-500 text-sm">No alerts this week.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Alerts</h2>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{alerts.length}</span>
      </div>
      <div className="space-y-3">
        {alerts.map((a) => {
          const s = severityStyles[a.severity];
          return (
            <div key={a.id} className={`border ${s.border} rounded-lg p-4 bg-gray-800/30`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.badge}`}>
                      {typeLabel[a.type]}
                    </span>
                    <span className="text-xs text-gray-500">{a.timestamp}</span>
                  </div>
                  <p className="font-medium text-sm mb-1">{a.title}</p>
                  <p className="text-gray-400 text-sm mb-2">{a.body}</p>
                  <div className="bg-gray-900/60 rounded p-2 space-y-1">
                    <p className="text-xs text-green-400">→ {a.action}</p>
                    <p className="text-xs text-gray-500">{a.impact}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
