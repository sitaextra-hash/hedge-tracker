"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type TradePrefill = {
  ticker: string;
  action: "buy" | "sell";
  suggestedAmount?: number;
  suggestedPrice?: number;
  note?: string;
};

type InputMode = "shares" | "amount";

export default function TradeModal({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill: TradePrefill | null;
}) {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<InputMode>("amount");
  const [shares, setShares] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && prefill) {
      setTicker(prefill.ticker);
      setAction(prefill.action);
      setMode("amount");
      setAmount(prefill.suggestedAmount ? prefill.suggestedAmount.toFixed(2) : "");
      setShares("");
      setPrice(prefill.suggestedPrice ? prefill.suggestedPrice.toFixed(2) : "");
      setNote(prefill.note ?? "");
      setError(null);
    }
  }, [open, prefill]);

  if (!open) return null;

  const priceNum = Number(price);
  const sharesNum =
    mode === "shares"
      ? Number(shares)
      : priceNum > 0 && Number(amount) > 0
        ? Number(amount) / priceNum
        : 0;
  const amountNum =
    mode === "amount"
      ? Number(amount)
      : priceNum > 0 && Number(shares) > 0
        ? Number(shares) * priceNum
        : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ticker || !price) {
      setError("Ticker and price are required");
      return;
    }
    if (priceNum <= 0) {
      setError("Price must be positive");
      return;
    }
    if (mode === "shares" && (!shares || Number(shares) <= 0)) {
      setError("Shares must be positive");
      return;
    }
    if (mode === "amount" && (!amount || Number(amount) <= 0)) {
      setError("Amount must be positive");
      return;
    }
    if (sharesNum <= 0) {
      setError("Computed shares must be positive");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          action,
          shares: sharesNum,
          price: priceNum,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Trade failed");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onClose();
      router.refresh();
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  const modeBtn = (m: InputMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
        mode === m
          ? "bg-gray-700 text-white"
          : "bg-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Record Trade</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-400 uppercase">Ticker</span>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 font-mono text-sm focus:border-gray-600 focus:outline-none"
                placeholder="VOO"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 uppercase">Action</span>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as "buy" | "sell")}
                className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:border-gray-600 focus:outline-none"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase">Enter as</span>
            <div className="mt-1 flex bg-gray-950 border border-gray-800 rounded p-1 gap-1">
              {modeBtn("amount", "Dollar amount")}
              {modeBtn("shares", "Shares")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {mode === "amount" ? (
              <label className="block">
                <span className="text-xs text-gray-400 uppercase">Amount ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 font-mono text-sm focus:border-gray-600 focus:outline-none"
                  placeholder="100.00"
                  required
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-xs text-gray-400 uppercase">Shares</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 font-mono text-sm focus:border-gray-600 focus:outline-none"
                  placeholder="0.25"
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-gray-400 uppercase">Price / share</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 font-mono text-sm focus:border-gray-600 focus:outline-none"
                placeholder="550.00"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-gray-400 uppercase">Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:border-gray-600 focus:outline-none"
              placeholder="Rebalance — down 10% this week"
            />
          </label>

          <div className="bg-gray-950 border border-gray-800 rounded p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Shares</span>
              <span className="font-mono text-gray-300">
                {sharesNum > 0 ? sharesNum.toFixed(4) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-mono text-white">
                ${amountNum > 0 ? amountNum.toFixed(2) : "0.00"}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/30 border border-red-900/50 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 py-2 text-sm rounded font-semibold transition-colors disabled:opacity-50 ${
                action === "buy"
                  ? "bg-green-700 hover:bg-green-600 text-white"
                  : "bg-red-700 hover:bg-red-600 text-white"
              }`}
            >
              {submitting ? "Recording…" : `Record ${action}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
