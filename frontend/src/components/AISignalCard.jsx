import { motion } from 'framer-motion'

function AISignalCard({
  symbol = 'NSE:NIFTY50-INDEX',
  signalType = 'HOLD',
  confidence = 64,
  strategy = 'MA_CROSSOVER',
}) {
  const type = signalType.toUpperCase()

  const styleMap = {
    BUY: {
      border: 'border-emerald-400/80',
      signalText: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
      shadow: '0 0 24px rgba(52, 211, 153, 0.35)',
    },
    SELL: {
      border: 'border-rose-500/80',
      signalText: 'text-rose-300',
      bg: 'bg-rose-500/10',
      shadow: '0 0 16px rgba(244, 63, 94, 0.2)',
    },
    HOLD: {
      border: 'border-slate-500/70',
      signalText: 'text-slate-300',
      bg: 'bg-slate-500/10',
      shadow: '0 0 0 rgba(0, 0, 0, 0)',
    },
  }

  const current = styleMap[type] || styleMap.HOLD

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, boxShadow: current.shadow }}
      transition={{ duration: 0.35 }}
      className={`mt-6 rounded-2xl border ${current.border} bg-panel/80 p-5`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mono text-xs uppercase tracking-[0.28em] text-teal-300">AI Signal</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">{symbol}</h3>
          <p className="mt-1 text-sm text-slate-400">Strategy: {strategy}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className={`rounded-xl border border-white/10 px-4 py-3 ${current.bg}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Signal</p>
            <p className={`mt-1 text-lg font-semibold ${current.signalText}`}>{type}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Confidence</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{confidence}%</p>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default AISignalCard
