import { motion } from 'framer-motion'

function Portfolio() {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-semibold text-slate-100">Portfolio</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-panel/80 p-5">
          <p className="text-sm text-slate-500">Total Value</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">INR 9,83,500</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel/80 p-5">
          <p className="text-sm text-slate-500">Unrealized P&L</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">+ INR 24,210</p>
        </article>
      </div>
    </motion.section>
  )
}

export default Portfolio
