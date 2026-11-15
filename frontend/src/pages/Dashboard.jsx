import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, ArrowUpRight, Bitcoin, BrainCircuit, CandlestickChart, CheckCircle2, Eye, Gauge, Layers3, Minus, Plus, RefreshCw, ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react'
import api from '../services/api'
import '../App.css'

const fmt = (v, d=2) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) : '--'
const Dot = ({live}) => <i className={'neon-dot '+(live?'live':'')} />

function CandleChart({rows,price}) {
  const data=rows.slice(-40)
  if(data.length<3) return <div className="chart-wait"><CandlestickChart/><span>Waiting for Delta candle history…</span></div>
  const max=Math.max(...data.map(x=>Number(x.high))), min=Math.min(...data.map(x=>Number(x.low))), span=max-min||1
  const y=v=>280-(v-min)/span*250, w=900/data.length
  return <svg viewBox="0 0 900 310" className="candle-svg" preserveAspectRatio="none">
    {[30,90,150,210,270].map(n=><line key={n} x1="0" x2="900" y1={n} y2={n} className="gridline"/>)}
    {data.map((c,i)=>{const o=Number(c.open),cl=Number(c.close),x=i*w+w/2,up=cl>=o,by=Math.min(y(o),y(cl)),bh=Math.max(2,Math.abs(y(o)-y(cl)));return <g key={c.timestamp||i} className={up?'up':'down'}><line x1={x} x2={x} y1={y(Number(c.high))} y2={y(Number(c.low))}/><rect x={x-w*.24} y={by} width={Math.max(4,w*.48)} height={bh} rx="1"/></g>})}
    <line x1="0" x2="900" y1={y(Number(price)||Number(data.at(-1).close))} y2={y(Number(price)||Number(data.at(-1).close))} className="price-line"/>
  </svg>
}

export default function Dashboard(){
 const [wallet,setWallet]=useState(null),[stream,setStream]=useState(null),[positions,setPositions]=useState([]),[candles,setCandles]=useState([]),[context,setContext]=useState(null)
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[tab,setTab]=useState('positions')
 const [side,setSide]=useState('SHORT'),[contracts,setContracts]=useState('1'),[leverage,setLeverage]=useState('1'),[sl,setSl]=useState(''),[tp,setTp]=useState(''),[review,setReview]=useState(false)
 const refresh=useCallback(async(quiet=false)=>{if(quiet)setRefreshing(true);try{const [w,m,p,c,x]=await Promise.all([api.get('/paper-trading/wallet'),api.get('/paper-trading/monitor/status'),api.get('/paper-trading/positions?status=OPEN&refresh=false'),api.get('/crypto/BTCUSD/candles?resolution=5m'),api.get('/crypto/BTCUSD/context?resolution=5m')]);setWallet(w.data.wallet);setStream(m.data.stream);setPositions(p.data.positions||[]);setCandles(c.data.candles||[]);setContext(x.data);setError('')}catch(e){setError(e.response?.data?.error||e.message)}finally{setLoading(false);setRefreshing(false)}},[])
 useEffect(()=>{refresh();const t=setInterval(()=>refresh(true),7000);return()=>clearInterval(t)},[refresh])
 const btc=stream?.prices?.BTCUSD,eth=stream?.prices?.ETHUSD,price=Number(btc?.price||context?.ticker?.markPrice||0),pnl=Number(wallet?.realizedPnL||0)+Number(wallet?.unrealizedPnL||0)
 const q=Math.max(0,Number(contracts)||0),lev=Math.max(1,Number(leverage)||1),notional=q*.001*price,margin=notional/lev
 const risk=Math.abs(price-Number(sl||price))*q*.001+notional*.0005+(Number(sl||0)*q*.001*.0005)
 const valid=side==='SHORT'?Number(sl)>price&&Number(tp)>0&&Number(tp)<price:Number(sl)>0&&Number(sl)<price&&Number(tp)>price
 const canReview=price>0&&q>0&&Number.isInteger(q)&&lev<=3&&valid&&risk<=5
 const atrRows=candles.slice(-15);const atr=atrRows.length>1?atrRows.slice(1).reduce((s,c,i)=>s+Math.max(Number(c.high)-Number(c.low),Math.abs(Number(c.high)-Number(atrRows[i].close)),Math.abs(Number(c.low)-Number(atrRows[i].close))),0)/(atrRows.length-1):null
 const signal=context?.signal
 return <motion.section className="terminal" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
  <header className="terminal-head"><div className="brand"><span><Eye/></span><div><b>TRINETRA <em>AI</em></b><small>INTELLIGENT FUTURES TRADING SYSTEM</small></div></div><nav><a className="active">⌂ Dashboard</a><a>▥ Trade</a><a>◉ AI Intelligence</a><a>✧ Strategy Lab</a><a>▱ Backtesting</a><a>▣ Portfolio</a><a>⬡ Risk</a></nav><b className="paper-mode"><ShieldCheck/> PAPER MODE <Dot live={stream?.connected}/></b></header>
  <div className="ticker"><span><Dot live={stream?.connected}/> MARKET FEED {stream?.connected?'LIVE':'CONNECTING'}</span><b>₿ BTCUSD <strong>{price?fmt(price):'—'}</strong></b><b>Ξ ETHUSD <strong>{eth?.price?fmt(eth.price):'—'}</strong></b><b>FUNDING <strong>{context?.funding?.analysis?.bias||'—'}</strong></b><b>OI <strong>{context?.openInterest?.analysis?.bias||'—'}</strong></b><span><Dot live={stream?.connected}/> WEBSOCKET</span></div>
  {error&&<div className="terminal-error">{error} — Check backend localhost:5000</div>}
  <div className="terminal-grid">
   <aside className="terminal-left">
    <section className="neo-panel"><h3><Wallet/> ACCOUNT OVERVIEW</h3><label>Total Equity</label><strong className="equity">{fmt(wallet?.totalEquity)} <small>USDT</small></strong><div className="account-lines"><span>Available</span><b>{fmt(wallet?.availableBalance)}</b><span>In Position</span><b>{fmt(wallet?.lockedMargin)}</b><span>Unrealized P&L</span><b>{fmt(wallet?.unrealizedPnL)}</b><span>Realized P&L</span><b>{fmt(wallet?.realizedPnL)}</b></div></section>
    <section className="neo-panel"><h3><ShieldCheck/> RISK STATUS</h3><div className="risk-line"><span>Risk per Trade</span><b>0.50%</b></div><div className="risk-track"><i/></div><div className="risk-line"><span>Daily Loss Limit</span><b>2.00%</b></div><div className="risk-track purple"><i/></div><div className="risk-line"><span>Daily P&L</span><b>{fmt(pnl)} USDT</b></div></section>
    <section className="neo-panel"><h3><Activity/> SYSTEM HEALTH</h3>{[['WebSocket',stream?.connected],['BTC Price Feed',btc?.fresh],['ETH Price Feed',eth?.fresh],['Paper Engine',!!wallet]].map(([n,v])=><div className="health-row" key={n}><Dot live={v}/><span>{n}</span><b>{v?'Connected':'Waiting'}</b></div>)}<small>SL / TP monitor · 1 second</small></section>
   </aside>
   <main className="terminal-center">
    <section className="neo-panel chart-panel"><div className="chart-head"><div><b className="btc">₿</b><strong>BTCUSD</strong><small>Perpetual</small></div><div className="timeframes"><button>1m</button><button className="selected">5m</button><button>15m</button><button>1H</button><button>4H</button></div><button className="refresh" onClick={()=>refresh(true)}><RefreshCw className={refreshing?'spin':''}/></button></div><div className="chart-meta"><span>EMA 9 <b>—</b></span><span>EMA 21 <b>—</b></span><strong>{price?fmt(price):'Waiting for price'}</strong></div><CandleChart rows={candles} price={price}/><div className="chart-foot"><span>DELTA EXCHANGE INDIA · 5 MIN</span><span>{candles.length} candles · public market data</span></div></section>
    <section className="neo-panel positions"><div className="tabs">{[['positions','Open Positions ('+positions.length+')'],['orders','Orders'],['history','Trade History'],['analytics','P&L Analytics']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'selected':''}>{label}</button>)}</div>{tab==='positions'&&positions.length>0?<div className="position-list">{positions.map(p=><div key={p.id}><b>{p.symbol}</b><strong className={p.side==='SHORT'?'loss':'gain'}>{p.side}</strong><span>{fmt(p.entryPrice)}</span><span>{fmt(p.markPrice)}</span><b>{fmt(p.unrealizedPnlUsdt)} USDT</b></div>)}</div>:<div className="empty"><Layers3/><b>{tab==='positions'?'No Open Positions':tab==='orders'?'No pending orders':tab==='history'?'No closed trades yet':'Analytics will appear after trading'}</b><span>Paper account data only. No orders have been placed.</span></div>}</section>
   </main>
   <aside className="terminal-right">
    <section className="neo-panel"><h3><BrainCircuit/> AI MARKET INTELLIGENCE</h3><small className="ai-sub">◉ BTCUSD · 5m ANALYSIS</small><div className="verdict"><Sparkles/><div><b>{signal?.signal||'ANALYZING'}</b><small>{signal?.reason||'Waiting for a confirmed strategy signal'}</small></div></div><div className="intel"><div><span>Trend / EMA</span><b>{signal?.trend||'—'}</b></div><div><span>RSI (14)</span><b>{signal?.indicators?.rsi??'—'}</b></div><div><span>ATR (14, 5m)</span><b>{atr?fmt(atr):'—'}</b></div><div><span>FVG Zones</span><b>{context?.fairValueGaps?.length||'None'}</b></div><div><span>Funding</span><b>{context?.funding?.analysis?.bias||'—'}</b></div><div><span>Order Book</span><b>{context?.orderBook?.bias||'—'}</b></div></div><div className="insight"><b><Sparkles/> AI INSIGHT</b><p>{context?.note||'Market context is research-only. Wait for a confirmed setup.'}</p></div></section>
    <section className="neo-panel order-panel"><h3><Zap/> PAPER TRADE PANEL</h3><div className="side-switch"><button className={side==='LONG'?'long-active':''} onClick={()=>{setSide('LONG');setReview(false)}}>LONG</button><button className={side==='SHORT'?'short-active':''} onClick={()=>{setSide('SHORT');setReview(false)}}>SHORT</button></div><label>Contracts</label><div className="stepper"><button onClick={()=>setContracts(String(Math.max(1,q-1)))}><Minus/></button><input value={contracts} onChange={e=>{setContracts(e.target.value);setReview(false)}}/><button onClick={()=>setContracts(String(Math.min(100,q+1)))}><Plus/></button></div><label>Leverage</label><select value={leverage} onChange={e=>setLeverage(e.target.value)}><option value="1">1x</option><option value="2">2x</option><option value="3">3x</option></select><label>Entry (Market)</label><div className="read-field">≈ {price?fmt(price):'Waiting for feed'}</div><label>Stop Loss</label><input type="number" value={sl} onChange={e=>{setSl(e.target.value);setReview(false)}} placeholder={side==='SHORT'?'Above entry':'Below entry'}/><label>Take Profit</label><input type="number" value={tp} onChange={e=>{setTp(e.target.value);setReview(false)}} placeholder={side==='SHORT'?'Below entry':'Above entry'}/><div className="estimates"><div><span>Notional</span><b>{fmt(notional)} USD</b></div><div><span>Est. Margin</span><b>{fmt(margin)} USDT</b></div><div><span>Est. Risk incl. fees*</span><b className={risk<=5?'gain':'loss'}>{fmt(risk,4)} USDT</b></div></div><button className="review-btn" disabled={!canReview} onClick={()=>setReview(true)}>REVIEW PAPER ORDER <ArrowUpRight/></button>{review&&<div className="review-ok"><CheckCircle2/> Preview only. No order submitted; backend validation and confirmation are still required.</div>}<small className="hint">*Indicative only. USD/USDT simulated at 1:1. Slippage and gaps may increase losses.</small></section>
    <section className="neo-panel"><h3><Gauge/> MARKET WATCH</h3><div className="watch"><span>₿ BTCUSD</span><b>{btc?.price?fmt(btc.price):'—'}</b><Dot live={btc?.fresh}/></div><div className="watch"><span>Ξ ETHUSD</span><b>{eth?.price?fmt(eth.price):'—'}</b><Dot live={eth?.fresh}/></div></section>
   </aside>
  </div>
  <footer className="terminal-footer"><span><Eye/> TRINETRA AI · FUTURES INTELLIGENCE</span><span>PAPER SIMULATION ONLY · NO LIVE ORDERS</span><span>{loading?'Connecting…':'Auto refresh · 7s'}</span></footer>
 </motion.section>
}
