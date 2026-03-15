import { motion } from 'framer-motion'

function Settings() {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-semibold text-slate-100">Settings</h2>
      <div className="mt-5 max-w-2xl rounded-2xl border border-border bg-panel/80 p-5">
        <label className="block text-sm text-slate-400">Default Trading Symbol</label>
        <input
          defaultValue="NSE:NIFTY50-INDEX"
          className="mt-2 w-full rounded-xl border border-border bg-slate-900 px-3 py-2 text-slate-200 focus:border-teal-400 focus:outline-none"
        />
        <button className="mt-4 rounded-xl bg-teal-500 px-5 py-2 font-medium text-slate-900 transition hover:bg-teal-400">
          Save Preferences
        </button>
      </div>
    </motion.section>
  )
}

export default Settings
