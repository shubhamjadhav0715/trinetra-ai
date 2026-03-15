import { useState } from 'react'

function BacktestPanel({ onRun, loading = false }) {
  const symbols = [
    'NSE:NIFTY50-INDEX',
    'NSE:NIFTYBANK-INDEX',
    'NSE:FINNIFTY-INDEX',
    'NSE:SBIN-EQ',
    'NSE:RELIANCE-EQ',
  ]

  const [symbol, setSymbol] = useState('NSE:NIFTY50-INDEX')
  const [resolution, setResolution] = useState('15')
  const [strategy, setStrategy] = useState('AUTO')
  const [from, setFrom] = useState('2025-01-01')
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [initialCapital, setInitialCapital] = useState(100000)
  const [riskPercent, setRiskPercent] = useState(1)

  const submit = (event) => {
    event.preventDefault()
    onRun({
      symbol: symbol.trim(),
      resolution,
      strategy,
      from,
      to,
      initialCapital: Number(initialCapital),
      riskPercent: Number(riskPercent),
    })
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-panel/80 p-4">
      <h3 className="text-lg font-medium text-slate-100">Run Backtest</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200">
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200" placeholder="Custom symbol (NSE:SBIN-EQ)" />
        <input value={resolution} onChange={(e) => setResolution(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200" placeholder="Resolution (e.g. 5, 15, D)" />
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200">
          <option value="AUTO">AUTO</option>
          <option value="RSI">RSI</option>
          <option value="MA_CROSSOVER">MA_CROSSOVER</option>
          <option value="MACD">MACD</option>
          <option value="BOLLINGER">BOLLINGER</option>
        </select>
        <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200" placeholder="Initial Capital" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200" />
        <input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} className="rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200" placeholder="Risk %" />
      </div>
      <button disabled={loading} className="mt-4 rounded-xl bg-teal-500 px-5 py-2 font-medium text-slate-900 disabled:opacity-50">
        {loading ? 'Running...' : 'RUN BACKTEST'}
      </button>
    </form>
  )
}

export default BacktestPanel
