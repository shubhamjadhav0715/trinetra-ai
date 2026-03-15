import { motion } from 'framer-motion'

const strategies = [
  { name: 'RSI Reversal', status: 'Active', performance: '+8.4%' },
  { name: 'MA Crossover', status: 'Active', performance: '+6.1%' },
  { name: 'Breakout Band', status: 'Paused', performance: '+2.2%' },
]

function Strategies() {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-semibold text-slate-100">Strategies</h2>
      <div className="mt-5 space-y-3">
        {strategies.map((item) => (
          <article key={item.name} className="rounded-2xl border border-border bg-panel/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-100">{item.name}</h3>
                <p className="text-sm text-slate-500">{item.status}</p>
              </div>
              <p className="text-emerald-300">{item.performance}</p>
            </div>
          </article>
        ))}
      </div>
    </motion.section>
  )
}

export default Strategies
