import { useEffect, useRef } from 'react'
import { createChart } from 'lightweight-charts'

function EquityCurveChart({ points = [] }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 280,
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
    })

    const line = chart.addLineSeries({ color: '#22d3ee', lineWidth: 2 })
    const normalized = points.map((point, index) => {
      if (point && typeof point === 'object') {
        return {
          time: Number(point.timestamp),
          value: Number(point.equity),
        }
      }
      return {
        time: index,
        value: Number(point),
      }
    })

    line.setData(normalized.filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value)))

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
  }, [points])

  return <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-border bg-slate-900/60" />
}

export default EquityCurveChart
