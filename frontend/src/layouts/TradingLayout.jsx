import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNavbar from '../components/TopNavbar'
import MobileNav from '../components/MobileNav'

function TradingLayout() {
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'
  if (isDashboard) {
    return <div className="min-h-screen bg-[#030916] text-slate-100"><main className="w-full p-2 md:p-3 lg:p-4"><Outlet /></main></div>
  }
  return (
    <div className="min-h-screen bg-transparent text-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopNavbar />
          <MobileNav />
          <main className="flex-1 p-4 md:p-6 lg:px-8 lg:py-7"><Outlet /></main>
        </div>
      </div>
    </div>
  )
}
export default TradingLayout
