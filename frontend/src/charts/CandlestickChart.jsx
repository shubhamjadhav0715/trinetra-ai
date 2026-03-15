import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import api from '../services/api'

function CandlestickChart({ symbol = 'NSE:NIFTY50-INDEX', resolution = '15' }) {
  const containerRef = useRef(null)
  const [data, setData] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const fetchCandles = async () => {
      try {
        setError('')
        const response = await api.get(
          `/market/history/${encodeURIComponent(symbol)}?resolution=${encodeURIComponent(
            resolution,
          )}`,
        )
        const candles = Array.isArray(response.data?.candles) ? response.data.candles : []
        const parsed = candles.map((candle) => ({
          time: Number(candle.timestamp),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }))
        if (active) setData(parsed)
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || err.message || 'Failed to load candles')
          setData([])
        }
      }
    }

    fetchCandles()
    return () => {
      active = false
    }
  }, [symbol, resolution])

  useEffect(() => {
    if (!containerRef.current) return undefined

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 360,
      layout: {
        background: { color: '#0b1220' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155' },
      crosshair: {
        vertLine: { color: '#14b8a6' },
        horzLine: { color: '#14b8a6' },
      },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    candleSeries.setData(data)
    chart.timeScale().fitContent()

    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.remove()
    }
  }, [data])

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-border bg-slate-900/70"
      />
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  )
}

export default CandlestickChart
