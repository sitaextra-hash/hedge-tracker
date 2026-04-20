"use client";
import { useMemo, useState } from "react";

export type ChartSeries = {
  key: string;      // "overall" or ticker
  label: string;    // display label
  points: { date: string; value: number }[]; // sorted ascending
};

export default function ProgressChart({ series }: { series: ChartSeries[] }) {
  const [selected, setSelected] = useState<string>(series[0]?.key ?? "overall");

  const active = series.find((s) => s.key === selected) ?? series[0];

  const { pathD, areaD, width, height, pad, min, max, first, last, xFor, yFor } = useMemo(() => {
    const width = 800;
    const height = 260;
    const pad = { top: 16, right: 16, bottom: 28, left: 56 };
    const pts = active?.points ?? [];
    if (pts.length < 2) {
      return { pathD: "", areaD: "", width, height, pad, min: 0, max: 0, first: 0, last: 0,
        xFor: (_: number) => 0, yFor: (_: number) => 0 };
    }
    const values = pts.map((p) => p.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || rawMax * 0.05 || 1;
    const min = rawMin - span * 0.05;
    const max = rawMax + span * 0.05;
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const xFor = (i: number) => pad.left + (i / (pts.length - 1)) * plotW;
    const yFor = (v: number) => pad.top + (1 - (v - min) / (max - min)) * plotH;
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p.value).toFixed(2)}`).join(" ");
    const areaD =
      `M ${xFor(0).toFixed(2)} ${yFor(pts[0].value).toFixed(2)} ` +
      pts.slice(1).map((p, i) => `L ${xFor(i + 1).toFixed(2)} ${yFor(p.value).toFixed(2)}`).join(" ") +
      ` L ${xFor(pts.length - 1).toFixed(2)} ${(height - pad.bottom).toFixed(2)}` +
      ` L ${xFor(0).toFixed(2)} ${(height - pad.bottom).toFixed(2)} Z`;
    return { pathD, areaD, width, height, pad, min, max, first: pts[0].value, last: pts[pts.length - 1].value, xFor, yFor };
  }, [active]);

  if (!active || active.points.length < 2) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-2">Progress</h2>
        <p className="text-sm text-gray-500">Not enough history yet to draw a chart.</p>
      </div>
    );
  }

  const change = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const positive = change >= 0;

  const pts = active.points;
  const tickCount = Math.min(5, pts.length);
  const tickIdxs = Array.from({ length: tickCount }, (_, i) => Math.round((i / (tickCount - 1)) * (pts.length - 1)));
  const ySteps = 4;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => min + (i / ySteps) * (max - min));

  const strokeColor = positive ? "rgb(74 222 128)" : "rgb(248 113 113)";
  const fillGradientId = `chart-grad-${active.key.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Progress</h2>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span className="text-2xl font-mono font-semibold text-white">
              ${last.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-sm font-mono ${positive ? "text-green-400" : "text-red-400"}`}>
              {positive ? "+" : ""}${change.toFixed(0)} ({positive ? "+" : ""}{changePct.toFixed(2)}%)
            </span>
            <span className="text-xs text-gray-500">over period</span>
          </div>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm focus:border-gray-600 focus:outline-none"
        >
          {series.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id={fillGradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={pad.left} x2={width - pad.right}
                y1={yFor(v)} y2={yFor(v)}
                stroke="rgb(31 41 55)" strokeWidth="1" strokeDasharray="2 4"
              />
              <text
                x={pad.left - 8} y={yFor(v) + 3}
                textAnchor="end" fontSize="10" fill="rgb(107 114 128)" fontFamily="monospace"
              >
                ${v >= 10000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Area + line */}
          <path d={areaD} fill={`url(#${fillGradientId})`} />
          <path d={pathD} stroke={strokeColor} strokeWidth="2" fill="none" />

          {/* X ticks */}
          {tickIdxs.map((idx, i) => {
            const d = new Date(pts[idx].date);
            const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <text
                key={i}
                x={xFor(idx)} y={height - pad.bottom + 16}
                textAnchor="middle" fontSize="10" fill="rgb(107 114 128)" fontFamily="monospace"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-gray-600 mt-2">
        {selected === "overall"
          ? "Overall portfolio value = current shares × historical close for each holding."
          : `${active.label} value = current shares × historical close.`}
      </p>
    </div>
  );
}
