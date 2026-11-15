import { Bell, ShieldCheck, CircleHelp } from 'lucide-react'

function TopNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080e18]/80 px-4 py-3 backdrop-blur-xl md:px-7">
      <div className="flex items-center justify-between gap-4">
        <div><p className="mono text-[9px] uppercase tracking-[0.2em] text-slate-600">Workspace / Futures</p><p className="mt-1 text-xs font-medium text-slate-300">Personal trading environment</p></div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 sm:flex"><ShieldCheck size={14} className="text-emerald-300" /><span className="mono text-[9px] tracking-wider text-emerald-200">PAPER ONLY</span></div>
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 transition hover:text-slate-200" aria-label="Help"><CircleHelp size={16} /></button>
          <button className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-500 transition hover:text-slate-200" aria-label="Notifications"><Bell size={16} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-300" /></button>
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.08] text-[11px] font-semibold text-teal-200">TA</div>
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
