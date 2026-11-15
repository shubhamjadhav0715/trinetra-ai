import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ChartCandlestick, Bot, Wallet, ActivitySquare, Settings, ScanEye,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
  { to: '/market', label: 'Market Intelligence', icon: ChartCandlestick },
  { to: '/strategies', label: 'AI Strategies', icon: Bot },
  { to: '/portfolio', label: 'Paper Portfolio', icon: Wallet },
  { to: '/backtesting', label: 'Backtesting Lab', icon: ActivitySquare },
  { to: '/settings', label: 'System Settings', icon: Settings },
]

function Sidebar() {
  return (
    <aside className="hidden w-[258px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0b1421]/85 px-5 py-6 backdrop-blur-xl md:flex">
      <div className="mb-10 flex items-center gap-3 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/20 bg-teal-300/[0.08] text-teal-200 shadow-[0_0_24px_rgba(45,212,191,0.08)]"><ScanEye size={22} /></span>
        <div><p className="mono text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-300">TRINETRA AI</p><h1 className="mt-1 text-[15px] font-semibold tracking-tight text-slate-100">Intelligence Desk</h1></div>
      </div>
      <p className="mono mb-3 px-3 text-[9px] uppercase tracking-[0.2em] text-slate-600">Workspace</p>
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-medium transition-all duration-200 ${
                isActive ? 'border border-teal-300/15 bg-teal-300/[0.09] text-teal-100 shadow-[inset_2px_0_0_#45d7c4,0_8px_22px_rgba(0,0,0,.12)]' : 'border border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'
              }`
            }><Icon size={17} strokeWidth={1.8} />{item.label}</NavLink>
          )
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-teal-300/10 bg-gradient-to-br from-teal-300/[0.07] to-transparent p-4">
        <div className="flex items-center gap-2 text-teal-200"><span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_9px_#5eead4]" /><span className="mono text-[9px] tracking-[0.16em]">SIMULATION MODE</span></div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Virtual capital only. No live exchange orders.</p>
      </div>
    </aside>
  )
}

export default Sidebar
