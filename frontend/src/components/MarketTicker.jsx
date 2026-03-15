import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../services/api'

const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'RELIANCE']

function MarketTicker() {
  const [quotes, setQuotes] = useState(
    SYMBOLS.map((symbol) => ({ symbol, price: null, direction: 'neutral' })),
  )
  const prevPricesRef = useRef({})

  useEffect(() => {
    let active = true

    const fetchQuotes = async () => {
      try {
        const responses = await Promise.all(
          SYMBOLS.map((symbol) => api.get(`/market/${encodeURIComponent(symbol)}`)),
        )

        if (!active) return

        const nextQuotes = responses.map((response, index) => {
          const symbol = SYMBOLS[index]
          const price = Number(response.data?.price)
          const prev = prevPricesRef.current[symbol]
          let direction = 'neutral'

          if (Number.isFinite(price) && Number.isFinite(prev)) {
            if (price > prev) direction = 'up'
            if (price < prev) direction = 'down'
          }

          if (Number.isFinite(price)) {
            prevPricesRef.current[symbol] = price
          }

          return {
            symbol,
            price: Number.isFinite(price) ? price : null,
            direction,
          }
        })

        setQuotes(nextQuotes)
      } catch (error) {
        // Keep existing values when a request fails.
      }
    }

    fetchQuotes()
    const interval = setInterval(fetchQuotes, 15000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const tickerItems = useMemo(() => [...quotes, ...quotes], [quotes])

  return (
    <div className="overflow-hidden border-b border-border/80 bg-slate-900/70 py-2">
      <motion.div
        className="flex w-max gap-6 px-4"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        {tickerItems.map((item, index) => {
          const tone =
            item.direction === 'up'
              ? 'text-emerald-300'
              : item.direction === 'down'
                ? 'text-rose-300'
                : 'text-slate-300'

          return (
            <div
              key={`${item.symbol}-${index}`}
              className="flex min-w-44 items-center justify-between rounded-full border border-white/10 bg-slate-950/70 px-4 py-1.5"
            >
              <span className="mono text-xs tracking-wider text-slate-400">{item.symbol}</span>
              <span className={`ml-4 text-sm font-semibold ${tone}`}>
                {item.price === null ? '--' : item.price.toFixed(2)}
              </span>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

export default MarketTicker
