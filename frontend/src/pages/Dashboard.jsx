import { motion } from 'framer-motion'
import SparklineChart from '../charts/SparklineChart'
import AISignalCard from '../components/AISignalCard'
import useMarketData from '../hooks/useMarketData'

const cards = [
  { label: 'Daily P&L', value: '+INR 18,420', tone: 'text-emerald-300' },
  { label: 'Open Trades', value: '12', tone: 'text-cyan-300' },
  { label: 'Win Rate', value: '63.4%', tone: 'text-amber-300' },
  { label: 'Portfolio', value: 'INR 9.8L', tone: 'text-slate-200' },
]

const sampleSeries = [232, 241, 228, 250, 248, 263, 271, 265, 289, 301, 294, 315]

function Dashboard() {
  const { data, loading, error } = useMarketData('NSE:NIFTY50-INDEX')

  const confidenceValue = data?.signal?.confidence ?? 0
  const confidencePercent =
    confidenceValue <= 1 ? Math.round(confidenceValue * 100) : Math.round(confidenceValue)

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <p className="mono text-xs uppercase tracking-[0.28em] text-teal-300">Overview</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-100">Trading Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-border bg-panel/80 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </motion.article>
        ))}
      </div>

      <AISignalCard
        symbol={data?.symbol || 'NIFTY'}
        signalType={data?.signal?.type || 'HOLD'}
        confidence={confidencePercent}
        strategy={data?.signal?.strategy || (loading ? 'LOADING' : 'UNAVAILABLE')}
      />
      {loading && <p className="mt-2 text-sm text-slate-500">Loading AI signal...</p>}
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}

      <article className="mt-6 rounded-2xl border border-border bg-panel/80 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-100">Intraday Momentum</h3>
          <span className="mono text-xs text-slate-500">Last 12 ticks</span>
        </div>
        <SparklineChart points={sampleSeries} />
      </article>
    </motion.section>
  )
}

export default Dashboard
