import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNavbar from '../components/TopNavbar'
import MarketTicker from '../components/MarketTicker'
import MobileNav from '../components/MobileNav'

function TradingLayout() {
  return (
    <div className="min-h-screen bg-transparent text-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopNavbar />
          <MarketTicker />
          <MobileNav />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default TradingLayout
