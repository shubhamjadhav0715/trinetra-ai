import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import TradingLayout from './layouts/TradingLayout'
import Dashboard from './pages/Dashboard'
import Market from './pages/Market'
import Strategies from './pages/Strategies'
import Portfolio from './pages/Portfolio'
import Settings from './pages/Settings'
import Backtesting from './pages/Backtesting'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TradingLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="market" element={<Market />} />
          <Route path="strategies" element={<Strategies />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="backtesting" element={<Backtesting />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
