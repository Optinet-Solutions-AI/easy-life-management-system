'use client'

import { createContext, useContext, useState } from 'react'

export type Currency = 'THB' | 'EUR'

// Fixed exchange rate: 1 EUR = 37 THB
const THB_PER_EUR = 37

interface CurrencyCtx {
  currency: Currency
  toggle: () => void
  format: (amount_thb: number | null | undefined) => string
}

const CurrencyContext = createContext<CurrencyCtx>({
  currency: 'THB',
  toggle: () => {},
  format: (n) => `฿${(n ?? 0).toLocaleString()}`,
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('THB')

  const toggle = () => setCurrency(c => (c === 'THB' ? 'EUR' : 'THB'))

  const format = (amount_thb: number | null | undefined): string => {
    const n = amount_thb ?? 0
    if (currency === 'EUR') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(n / THB_PER_EUR)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
    }).format(n).replace('THB', '฿')
  }

  return (
    <CurrencyContext.Provider value={{ currency, toggle, format }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
