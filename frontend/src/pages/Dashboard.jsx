import { useCallback, useEffect, useMemo, useState } from 'react'
import '../App.css'
import { motion } from 'framer-motion'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bitcoin, CircleDot,
  Clock3, Cpu, Gauge, Layers3, RefreshCw, ShieldCheck, Wallet,
} from 'lucide-react'
import api from '../services/api'

const money = (value, digits = 2) => Number.isFinite(Number(value))
  ? Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  : '--'

function MetricCard({ label, value, hint, icon: Icon, tone = 'cyan', detail }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom"><span>{hint}</span>{detail && <strong>{detail}</strong>}</div>
    </article>
  )
}

function PriceSparkline({ points, tone }) {
  const values = points.filter((value) => Number.isFinite(value))
  if (values.length < 2) return <div className="chart-placeholder">Waiting for live mark-price samples…</div>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const coordinates = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100
    const y = 38 - ((value - min) / range) * 32
    return `${x},${y}`
  }).join(' ')
  return (
    <svg className={`sparkline ${tone}`} viewBox="0 0 100 42" preserveAspectRatio="none" role="img" aria-label="Recent live mark price samples">
      <polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Dashboard() {
  const [wallet, setWallet] = useState(null)
  const [stream, setStream] = useState(null)
  const [positions, setPositions] = useState([])
  const [samples, setSamples] = useState({ BTCUSD: [], ETHUSD: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    try {
      const [walletResponse, monitorResponse, positionsResponse] = await Promise.all([
        api.get('/paper-trading/wallet'),
        api.get('/paper-trading/monitor/status'),
        api.get('/paper-trading/positions?status=OPEN&refresh=false'),
      ])
      const nextWallet = walletResponse.data?.wallet
      const nextStream = monitorResponse.data?.stream
      setWallet(nextWallet || null)
      setStream(nextStream || null)
      setPositions(positionsResponse.data?.positions || [])
      if (nextStream?.prices) {
        setSamples((current) => {
          const next = { ...current }
          for (const symbol of ['BTCUSD', 'ETHUSD']) {
            const price = Number(nextStream.prices[symbol]?.price)
            if (Number.isFinite(price) && nextStream.prices[symbol]?.fresh) {
              next[symbol] = [...(current[symbol] || []), price].slice(-36)
            }
          }
          return next
        })
      }
      setLastUpdated(new Date())
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to connect to the paper trading API.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(() => refresh(true), 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const streamConnected = Boolean(stream?.connected)
  const freshCount = ['BTCUSD', 'ETHUSD'].filter((symbol) => stream?.prices?.[symbol]?.fresh).length
  const netPnl = Number(wallet?.realizedPnL || 0) + Number(wallet?.unrealizedPnL || 0)
  const pnlTone = netPnl >= 0 ? 'positive' : 'negative'
  const btc = stream?.prices?.BTCUSD
  const eth = stream?.prices?.ETHUSD
  const equity = Number(wallet?.totalEquity ?? wallet?.initialCapital ?? 0)
  const equityPercent = wallet?.initialCapital ? ((equity - wallet.initialCapital) / wallet.initialCapital) * 100 : 0
  const monitorLabel = streamConnected ? 'FEED CONNECTED' : 'FEED DISCONNECTED'
  const positionCount = positions.length

  const statusText = useMemo(() => {
    if (loading) return 'Connecting to local paper engine'
    if (error) return 'API connection needs attention'
    if (!streamConnected) return 'Waiting for Delta market feed'
    return 'All paper systems operational'
  }, [loading, error, streamConnected])

  return (
    <motion.section className="dashboard-shell" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> TRINETRA INTELLIGENCE / OVERVIEW</div>
          <h1>Trading <span>Command Center</span></h1>
          <p className="heading-subtitle">Your market workspace. One view for capital, live prices and risk.</p>
        </div>
        <div className="heading-actions">
          <div className="paper-pill"><span className="pulse-dot" /> PAPER ENVIRONMENT</div>
          <button className="icon-button" onClick={() => refresh(true)} disabled={refreshing} aria-label="Refresh dashboard" title="Refresh dashboard">
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="system-strip">
        <div className="system-state"><span className={`status-dot ${streamConnected ? 'online' : 'offline'}`} /><strong>{statusText}</strong></div>
        <div className="system-meta"><span><Clock3 size={13} /> 1s risk checks</span><i /> <span><Activity size={13} /> {freshCount}/2 fresh markets</span><i /> <span>Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span></div>
      </div>

      {error && <div className="error-banner"><CircleDot size={16} /> {error} <span>Check that the backend is running on port 5000.</span></div>}

      <div className="metrics-grid">
        <MetricCard label="TOTAL EQUITY" value={`${money(wallet?.totalEquity)} USDT`} hint="Paper account valuation" icon={Wallet} tone="cyan" detail={`${equityPercent >= 0 ? '+' : ''}${money(equityPercent)}%`} />
        <MetricCard label="AVAILABLE BALANCE" value={`${money(wallet?.availableBalance)} USDT`} hint="Free collateral" icon={Layers3} tone="blue" detail={`${money(wallet?.lockedMargin)} locked`} />
        <MetricCard label="NET P&L" value={`${netPnl >= 0 ? '+' : ''}${money(netPnl)} USDT`} hint="Realized + unrealized" icon={netPnl >= 0 ? ArrowUpRight : ArrowDownRight} tone={pnlTone} detail={`${money(wallet?.totalFees)} fees`} />
        <MetricCard label="OPEN POSITIONS" value={String(positionCount).padStart(2, '0')} hint="Across enabled perpetuals" icon={BarChart3} tone="violet" detail="MAX 03" />
      </div>

      <div className="section-heading">
        <div><div className="eyebrow">MARKET PULSE</div><h2>Live futures markets</h2></div>
        <div className="live-label"><span className="pulse-dot" /> DELTA MARK PRICE</div>
      </div>

      <div className="market-grid">
        <article className="market-card">
          <div className="market-card-head">
            <div className="asset-identity"><span className="asset-logo btc"><Bitcoin size={20} /></span><div><strong>Bitcoin</strong><small>BTCUSD · Perpetual</small></div></div>
            <span className={`feed-tag ${btc?.fresh ? 'fresh' : 'stale'}`}>{btc?.fresh ? 'LIVE' : 'STALE'}</span>
          </div>
          <div className="market-price-row"><strong>{btc?.price ? `$${money(btc.price, 2)}` : '—'}</strong><span>USD</span></div>
          <div className="market-chart"><PriceSparkline points={samples.BTCUSD} tone="cyan-line" /></div>
          <div className="market-card-foot"><span>Mark price</span><strong>{btc ? `${money(btc.ageMs / 1000, 1)}s ago` : 'No feed'}</strong></div>
        </article>
        <article className="market-card">
          <div className="market-card-head">
            <div className="asset-identity"><span className="asset-logo eth">Ξ</span><div><strong>Ethereum</strong><small>ETHUSD · Perpetual</small></div></div>
            <span className={`feed-tag ${eth?.fresh ? 'fresh' : 'stale'}`}>{eth?.fresh ? 'LIVE' : 'STALE'}</span>
          </div>
          <div className="market-price-row"><strong>{eth?.price ? `$${money(eth.price, 2)}` : '—'}</strong><span>USD</span></div>
          <div className="market-chart"><PriceSparkline points={samples.ETHUSD} tone="violet-line" /></div>
          <div className="market-card-foot"><span>Mark price</span><strong>{eth ? `${money(eth.ageMs / 1000, 1)}s ago` : 'No feed'}</strong></div>
        </article>
      </div>

      <div className="lower-grid">
        <section className="panel positions-panel">
          <div className="panel-heading"><div><div className="eyebrow">YOUR EXPOSURE</div><h2>Open positions</h2></div><span className="count-chip">{positionCount} ACTIVE</span></div>
          {positions.length === 0 ? (
            <div className="empty-state"><span className="empty-icon"><BarChart3 size={21} /></span><strong>No open positions</strong><p>Your paper positions will appear here when you choose to create one.</p><span className="empty-note">NO ORDERS HAVE BEEN PLACED</span></div>
          ) : (
            <div className="table-wrap"><table className="positions-table"><thead><tr><th>CONTRACT</th><th>SIDE</th><th>ENTRY</th><th>MARK</th><th>UNREALIZED P&L</th></tr></thead><tbody>
              {positions.map((position) => <tr key={position.id}><td><strong>{position.symbol}</strong><small>{position.contracts} contract(s) · {position.leverage}x</small></td><td><span className={`side-tag ${position.side.toLowerCase()}`}>{position.side}</span></td><td>${money(position.entryPrice)}</td><td>${money(position.markPrice)}</td><td className={Number(position.unrealizedPnlUsdt) >= 0 ? 'pnl-positive' : 'pnl-negative'}>{Number(position.unrealizedPnlUsdt) >= 0 ? '+' : ''}{money(position.unrealizedPnlUsdt)} USDT</td></tr>)}
            </tbody></table></div>
          )}
        </section>

        <section className="panel protection-panel">
          <div className="panel-heading"><div><div className="eyebrow">GUARDRAILS</div><h2>Risk protection</h2></div><ShieldCheck size={20} className="protection-icon" /></div>
          <div className="risk-status"><span className={`status-dot ${streamConnected ? 'online' : 'offline'}`} /><div><strong>{streamConnected ? 'Monitoring active' : 'Feed unavailable'}</strong><small>Local SL / TP checks · every 1 second</small></div></div>
          <div className="risk-rules">
            <div><span>Risk per trade</span><strong>0.50% <small>· 5.00 USDT</small></strong></div>
            <div><span>Daily loss limit</span><strong>2.00% <small>· 20.00 USDT</small></strong></div>
            <div><span>Maximum leverage</span><strong>3×</strong></div>
            <div><span>Maximum positions</span><strong>3</strong></div>
          </div>
          <div className="paper-only-note"><Cpu size={15} /><span>Paper simulation only. No live exchange orders are enabled.</span></div>
        </section>
      </div>

      <footer className="dashboard-footer"><span><Gauge size={14} /> TRINETRA AI · FUTURES SIMULATION</span><span>USD / USDT simulated at 1:1 · Not an exchange account</span></footer>
    </motion.section>
  )
}

export default Dashboard
