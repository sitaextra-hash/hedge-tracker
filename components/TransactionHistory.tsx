import type { DbTransaction } from "@/lib/db";

export default function TransactionHistory({ transactions }: { transactions: DbTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-2">Transaction History</h2>
        <p className="text-sm text-gray-500">
          No trades recorded yet. Use the Execute button on any suggestion — or add a manual trade — to start tracking real positions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Transaction History</h2>
        <span className="text-xs text-gray-500">{transactions.length} recent</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-[10px] uppercase border-b border-gray-800">
              <th className="text-left pb-2 pr-3">Date</th>
              <th className="text-left pb-2 pr-3">Ticker</th>
              <th className="text-left pb-2 pr-3">Action</th>
              <th className="text-right pb-2 pr-3">Shares</th>
              <th className="text-right pb-2 pr-3">Price</th>
              <th className="text-right pb-2 pr-3">Amount</th>
              <th className="text-left pb-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {transactions.map((t) => {
              const d = new Date(t.executedAt);
              const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="py-2 pr-3 text-xs text-gray-400 font-mono">{dateStr}</td>
                  <td className="py-2 pr-3 font-mono font-semibold">{t.ticker}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                        t.action === "buy"
                          ? "bg-green-900/40 text-green-300"
                          : "bg-red-900/40 text-red-300"
                      }`}
                    >
                      {t.action}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">{t.shares.toFixed(4)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">${t.price.toFixed(2)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">${t.amount.toFixed(2)}</td>
                  <td className="py-2 text-xs text-gray-500 truncate max-w-[200px]">{t.note ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
