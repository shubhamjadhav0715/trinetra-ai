import { useEffect, useState } from 'react'
import api from '../services/api'

function useMarketData(symbol = 'NSE:NIFTY50-INDEX') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const targetSymbol = symbol || 'NSE:NIFTY50-INDEX'
    let active = true

    const fetchMarket = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get(`/market/${encodeURIComponent(targetSymbol)}`)
        const payload = response.data || {}

        const normalized = {
          symbol: payload.symbol || targetSymbol,
          price: payload.price ?? null,
          signal: {
            type: payload.signal?.type || 'HOLD',
            confidence: payload.signal?.confidence ?? 0,
            strategy: payload.signal?.strategy || 'UNKNOWN',
          },
          indicators: payload.indicators || null,
          raw: payload,
        }

        if (active) {
          setData(normalized)
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || err.message || 'Request failed')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchMarket()
    return () => {
      active = false
    }
  }, [symbol])

  return { data, loading, error }
}

export default useMarketData
