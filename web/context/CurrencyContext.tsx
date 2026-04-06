'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Currency = 'THB' | 'EUR'

const FALLBACK_RATE = 37

interface CurrencyCtx {
  currency: Currency
  toggle: () => void
  format: (amount_thb: number | null | undefined) => string
  rate: number
  rateSource: string | null
  rateFetchedAt: string | null
  refreshRate: () => Promise<void>
  refreshing: boolean
}

const CurrencyContext = createContext<CurrencyCtx>({
  currency: 'THB',
  toggle: () => {},
  format: (n) => `฿${(n ?? 0).toLocaleString()}`,
  rate: FALLBACK_RATE,
  rateSource: null,
  rateFetchedAt: null,
  refreshRate: async () => {},
  refreshing: false,
})

async function loadRate() {
  const res = await fetch('/api/exchange-rate')
  if (!res.ok) throw new Error('fetch failed')
  return res.json() as Promise<{ rate: number; source: string; fetched_at: string | null }>
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('THB')
  const [rate, setRate] = useState<number>(FALLBACK_RATE)
  const [rateSource, setRateSource] = useState<string | null>(null)
  const [rateFetchedAt, setRateFetchedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const applyRate = (data: { rate: number; source: string; fetched_at: string | null }) => {
    if (data.rate && data.rate > 0) {
      setRate(data.rate)
      setRateSource(data.source ?? null)
      setRateFetchedAt(data.fetched_at ?? null)
    }
  }

  // Load stored rate on mount
  useEffect(() => {
    loadRate().then(applyRate).catch(() => {})
  }, [])

  // Manual refresh: hit ECB, then reload the stored rate
  const refreshRate = useCallback(async () => {
    setRefreshing(true)
    try {
      const refreshRes = await fetch('/api/cron/exchange-rate')
      if (!refreshRes.ok) throw new Error('refresh failed')
      const updated = await loadRate()
      applyRate(updated)
    } catch {
      // Silently keep existing rate on failure
    } finally {
      setRefreshing(false)
    }
  }, [])

  const toggle = () => setCurrency(c => (c === 'THB' ? 'EUR' : 'THB'))

  const format = (amount_thb: number | null | undefined): string => {
    const n = amount_thb ?? 0
    if (currency === 'EUR') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(n / rate)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    }).format(n).replace('THB', '฿')
  }

  return (
    <CurrencyContext.Provider value={{ currency, toggle, format, rate, rateSource, rateFetchedAt, refreshRate, refreshing }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
