"use client";
import { ThesisTicker } from "@/lib/mockData";

export default function ThesisTrackerPanel({ tickers }: { tickers: ThesisTicker[] }) {
  const moversUp = tickers.filter((t) => t.weekChangePct > 5);
  const moversDown = tickers.filter((t) => t.weekChangePct < -5);
  const alertTriggered = moversUp.length >= 3 || moversDown.length >= 3;

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-lg font-semibold">Situational Awareness Thesis</h2>
        {alertTriggered && (
          <span className="text-xs bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded font-medium animate-pulse">
            ALERT
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        AI compute thesis names · Alerts when 3+ move &gt;5% same direction in a week
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tickers.map((t) => {
          const up = t.weekChangePct > 0;
          const hot = Math.abs(t.weekChangePct) > 5;
          return (
            <div
              key={t.ticker}
              className={`rounded-lg p-3 border ${
                hot
                  ? up
                    ? "border-green-700/60 bg-green-900/20"
                    : "border-red-700/60 bg-red-900/20"
                  : "border-gray-800 bg-gray-800/30"
              }`}
            >
              <div className="font-mono font-bold text-sm">{t.ticker}</div>
              <div className="text-xs text-gray-500 mb-2">{t.name}</div>
              <div className="font-mono text-sm">${t.price.toFixed(2)}</div>
              <div className={`text-sm font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                {up ? "▲" : "▼"} {Math.abs(t.weekChangePct).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
      {alertTriggered && (
        <div className="mt-4 p-3 rounded-lg bg-blue-900/30 border border-blue-700/50 text-sm text-blue-300">
          {moversUp.length >= 3
            ? `${moversUp.length} names up >5% this week: ${moversUp.map((t) => t.ticker).join(", ")}`
            : `${moversDown.length} names down >5% this week: ${moversDown.map((t) => t.ticker).join(", ")}`}
        </div>
      )}
    </div>
  );
}
