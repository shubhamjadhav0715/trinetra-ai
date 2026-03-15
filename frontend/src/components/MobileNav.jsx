import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/market', label: 'Market' },
  { to: '/strategies', label: 'Strategies' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/backtesting', label: 'Backtesting' },
  { to: '/settings', label: 'Settings' },
]

function MobileNav() {
  return (
    <nav className="md:hidden">
      <div className="flex gap-2 overflow-x-auto border-b border-border/80 bg-panel/60 px-4 py-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                isActive ? 'bg-teal-400/20 text-teal-200' : 'bg-slate-800/80 text-slate-400'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default MobileNav
