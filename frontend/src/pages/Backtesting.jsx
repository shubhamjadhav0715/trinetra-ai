import { useState } from 'react'
import { motion } from 'framer-motion'
import api from '../services/api'
import BacktestPanel from '../components/BacktestPanel'
import EquityCurveChart from '../components/EquityCurveChart'
import TradeList from '../components/TradeList'

function Backtesting() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runBacktest = async (payload) => {
    try {
      setLoading(true)
      setError('')
      const response = await api.post('/backtest/run', payload)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  const metrics = result || {}

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-semibold text-slate-100">Backtesting Lab</h2>
      <p className="mt-1 text-sm text-slate-400">Research strategies on historical candles.</p>

      <div className="mt-5">
        <BacktestPanel onRun={runBacktest} loading={loading} />
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Win Rate" value={formatPct(metrics.winRate)} />
        <Metric label="Profit Factor" value={metrics.profitFactor} />
        <Metric label="Sharpe Ratio" value={metrics.sharpeRatio} />
        <Metric label="Max Drawdown" value={formatPct(metrics.maxDrawdown)} />
      </div>

      <div className="mt-5">
        <EquityCurveChart points={metrics.equityCurve || []} />
      </div>

      <div className="mt-5">
        <TradeList trades={metrics.trades || []} />
      </div>
    </motion.section>
  )
}

function Metric({ label, value }) {
  return (
    <article className="rounded-xl border border-border bg-panel/80 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value ?? '--'}</p>
    </article>
  )
}

function formatPct(value) {
  return value === undefined || value === null ? '--' : `${value}%`
}

export default Backtesting
