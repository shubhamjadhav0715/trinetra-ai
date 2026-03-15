import { Bell, Search, UserCircle2 } from 'lucide-react'

function TopNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/70 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-slate-900/80 px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
            placeholder="Search symbol, strategy, or order..."
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="rounded-full border border-border bg-panel p-2 text-slate-300 transition hover:text-teal-300">
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5">
            <UserCircle2 size={18} className="text-teal-300" />
            <span className="text-sm text-slate-300">Trader</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
