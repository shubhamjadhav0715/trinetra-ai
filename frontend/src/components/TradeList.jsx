function TradeList({ trades = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-panel/80 p-4">
      <h3 className="text-lg font-medium text-slate-100">Trade Ledger</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Entry</th>
              <th className="py-2">Exit</th>
              <th className="py-2">Qty</th>
              <th className="py-2">P&L</th>
              <th className="py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr key={`${trade.entryTimestamp || index}-${index}`} className="border-t border-white/5 text-slate-200">
                <td className="py-2">{trade.entryPrice}</td>
                <td className="py-2">{trade.exitPrice}</td>
                <td className="py-2">{trade.quantity}</td>
                <td className={`py-2 ${(trade.pnl ?? trade.profit) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {trade.pnl ?? trade.profit}
                </td>
                <td className="py-2">{trade.timestamp ?? trade.exitTimestamp ?? trade.entryTimestamp ?? '--'}</td>
              </tr>
            ))}
            {!trades.length && (
              <tr>
                <td className="py-3 text-slate-500" colSpan={5}>
                  No trades yet. Run a backtest.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TradeList
