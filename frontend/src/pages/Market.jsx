import { useState } from 'react'
import { motion } from 'framer-motion'
import useMarketData from '../hooks/useMarketData'
import CandlestickChart from '../charts/CandlestickChart'

function Market() {
  const [symbol, setSymbol] = useState('NSE:NIFTY50-INDEX')
  const [input, setInput] = useState('NSE:NIFTY50-INDEX')
  const { data, loading, error } = useMarketData(symbol)

  const submit = (event) => {
    event.preventDefault()
    setSymbol(input.trim())
  }

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-semibold text-slate-100">Market Scanner</h2>
      <p className="mt-1 text-sm text-slate-400">Pull live quotes and strategy signals.</p>

      <form
        onSubmit={submit}
        className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-panel/80 p-4 md:flex-row"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200 focus:border-teal-400 focus:outline-none"
          placeholder="NSE:SBIN-EQ"
        />
        <button className="rounded-xl bg-teal-500 px-5 py-2 font-medium text-slate-900 transition hover:bg-teal-400">
          Analyze
        </button>
      </form>

      <article className="mt-5 rounded-2xl border border-border bg-panel/80 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-medium text-slate-100">Candlestick Chart</h3>
          <p className="mt-1 text-sm text-slate-500">Historical OHLC candles from backend API.</p>
          <div className="mt-3">
            <CandlestickChart symbol={symbol} resolution="15" />
          </div>
        </div>

        {loading && <p className="text-slate-400">Loading market data...</p>}
        {error && <p className="text-rose-300">{error}</p>}
        {!loading && !error && data && (
          <div className="space-y-3">
            <p className="mono text-xs uppercase tracking-[0.2em] text-slate-500">{data.symbol}</p>
            <p className="text-3xl font-semibold text-slate-100">INR {data.price ?? '--'}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-slate-900/60 p-3">
                <p className="text-xs text-slate-500">RSI</p>
                <p className="mt-1 text-lg">{data.indicators?.rsi ?? '--'}</p>
              </div>
              <div className="rounded-xl border border-border bg-slate-900/60 p-3">
                <p className="text-xs text-slate-500">MA (5)</p>
                <p className="mt-1 text-lg">{data.indicators?.movingAverageShort ?? '--'}</p>
              </div>
              <div className="rounded-xl border border-border bg-slate-900/60 p-3">
                <p className="text-xs text-slate-500">MA (20)</p>
                <p className="mt-1 text-lg">{data.indicators?.movingAverageLong ?? '--'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-teal-400/40 bg-teal-400/10 p-4">
              <p className="text-sm text-teal-200">
                Signal: <strong>{data.signal?.type}</strong> | Confidence:{' '}
                <strong>{data.signal?.confidence}</strong> | Strategy:{' '}
                <strong>{data.signal?.strategy}</strong>
              </p>
            </div>
          </div>
        )}
      </article>
    </motion.section>
  )
}

export default Market
