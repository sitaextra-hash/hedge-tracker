"use client";
import { useState } from "react";
import type { Alert } from "@/lib/alerts";

const severityStyles: Record<Alert["severity"], { border: string; badge: string; dot: string }> = {
  yellow: { border: "border-yellow-700/50", badge: "bg-yellow-900/60 text-yellow-300", dot: "bg-yellow-400" },
  blue:   { border: "border-blue-700/50",   badge: "bg-blue-900/60 text-blue-300",     dot: "bg-blue-400" },
  green:  { border: "border-green-700/50",  badge: "bg-green-900/60 text-green-300",   dot: "bg-green-400" },
  gray:   { border: "border-gray-700/50",   badge: "bg-gray-800 text-gray-400",        dot: "bg-gray-500" },
  red:    { border: "border-red-700/50",    badge: "bg-red-900/60 text-red-300",       dot: "bg-red-400" },
};

const typeLabel: Record<Alert["type"], string> = {
  "drift":          "Drift",
  "drawdown":       "Drawdown",
  "hedge-fund":     "13F",
  "conviction":     "Conviction",
  "major-drawdown": "Drawdown",
  "ai-thesis":      "AI Thesis",
  "cash-deploy":    "Cash",
};

function AlertRow({ a }: { a: Alert }) {
  const [open, setOpen] = useState(false);
  const s = severityStyles[a.severity];

  return (
    <div className={`border ${s.border} rounded-lg bg-gray-800/20`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-800/40 transition-colors rounded-lg"
      >
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${s.badge}`}>
          {typeLabel[a.type]}
        </span>
        <span className="text-sm text-gray-200 flex-1 min-w-0 truncate">{a.title}</span>
        <span className="text-xs text-gray-600 flex-shrink-0">{a.timestamp}</span>
        <span className="text-gray-600 text-xs flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-800/60 pt-2.5">
          <p className="text-gray-400 text-xs">{a.body}</p>
          <p className="text-green-400 text-xs">→ {a.action}</p>
          <p className="text-gray-600 text-xs">{a.impact}</p>
        </div>
      )}
    </div>
  );
}

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-base font-semibold mb-1">Alerts</h2>
        <p className="text-gray-600 text-xs">No alerts this week.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold">Alerts</h2>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{alerts.length}</span>
        <span className="text-xs text-gray-600 ml-1">click to expand</span>
      </div>
      <div className="space-y-1.5">
        {alerts.map((a) => <AlertRow key={a.id} a={a} />)}
      </div>
    </div>
  );
}
