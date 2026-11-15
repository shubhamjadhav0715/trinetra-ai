import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNavbar from '../components/TopNavbar'
import MobileNav from '../components/MobileNav'

function TradingLayout() {
  return (
    <div className="min-h-screen bg-transparent text-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopNavbar />
          <MobileNav />
          <main className="flex-1 p-4 md:p-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default TradingLayout
