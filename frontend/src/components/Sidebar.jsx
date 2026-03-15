import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ChartCandlestick,
  Bot,
  Wallet,
  ActivitySquare,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/market', label: 'Market', icon: ChartCandlestick },
  { to: '/strategies', label: 'Strategies', icon: Bot },
  { to: '/portfolio', label: 'Portfolio', icon: Wallet },
  { to: '/backtesting', label: 'Backtesting', icon: ActivitySquare },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col border-r border-border/90 bg-panel/70 p-6 backdrop-blur md:flex">
      <div className="mb-8">
        <p className="mono text-xs uppercase tracking-[0.3em] text-teal-300">Trinetra AI</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Trading Desk</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  isActive
                    ? 'bg-teal-400/15 text-teal-200 shadow-glow'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
