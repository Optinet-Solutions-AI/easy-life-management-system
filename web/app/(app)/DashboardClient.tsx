'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/context/CurrencyContext'
import StatCard from '@/components/StatCard'

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: THIS_YEAR - 2022 }, (_, i) => 2023 + i) // 2023 → current year

interface BankBalance { id: string; label: string; amount: number; status?: string | null }
interface GuestRow {
  id: string; room: string; guest_name: string
  check_in: string; check_out: string
  amount_thb_stay: number | null; payment: number | null
}
interface Props {
  bankBalances: BankBalance[]
  currentGuests: GuestRow[]
  upcomingGuests: GuestRow[]
  todosByStatus: Record<string, number>
}

interface Financials {
  totalExpenses: number
  totalRevenue: number
  totalFounded: number
}

export default function DashboardClient({ bankBalances, currentGuests, upcomingGuests, todosByStatus }: Props) {
  const { format } = useCurrency()
  const [selectedYears, setSelectedYears] = useState<number[]>([THIS_YEAR])
  const [financials, setFinancials] = useState<Financials | null>(null)
  const [loading, setLoading] = useState(true)

  const toggleYear = (y: number) => {
    setSelectedYears(prev => {
      if (prev.includes(y)) {
        return prev.length === 1 ? prev : prev.filter(x => x !== y)
      }
      return [...prev, y].sort((a, b) => a - b)
    })
  }

  const fetchFinancials = useCallback(async () => {
    setLoading(true)
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    const from = `${minYear}-01-01`
    const to   = `${maxYear}-12-31`

    const [expensesRes, revenueRes, foundingRes] = await Promise.all([
      supabase.from('expenses').select('amount, payment_date').gte('payment_date', from).lte('payment_date', to),
      supabase.from('revenue').select('amount_thb, date').gte('date', from).lte('date', to),
      supabase.from('founding_contributions').select('amount_thb, date').gte('date', from).lte('date', to),
    ])

    // Handle non-contiguous year selections (e.g. 2024 + 2026 without 2025)
    const inRange = (dateStr: string | null) => {
      if (!dateStr) return false
      return selectedYears.includes(new Date(dateStr).getFullYear())
    }

    const totalExpenses = (expensesRes.data ?? [])
      .filter(r => inRange(r.payment_date))
      .reduce((s, r) => s + Math.abs(r.amount ?? 0), 0)

    const totalRevenue = (revenueRes.data ?? [])
      .filter(r => inRange(r.date))
      .reduce((s, r) => s + (r.amount_thb ?? 0), 0)

    const totalFounded = (foundingRes.data ?? [])
      .filter(r => inRange(r.date))
      .reduce((s, r) => s + (r.amount_thb ?? 0), 0)

    setFinancials({ totalExpenses, totalRevenue, totalFounded })
    setLoading(false)
  }, [selectedYears])

  useEffect(() => { fetchFinancials() }, [fetchFinancials])

  const netPosition = financials
    ? financials.totalRevenue + financials.totalFounded - financials.totalExpenses
    : 0

  const yearLabel = selectedYears.length === 1
    ? String(selectedYears[0])
    : selectedYears.join(' + ')

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* Header + Year Selector */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dream-T Management System</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1">Year</span>
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => toggleYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                selectedYears.includes(y)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Financial KPIs */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
          Financial Overview — {yearLabel}
          {loading && <Loader2 size={12} className="animate-spin text-blue-400" />}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Expenses"
            value={loading ? '—' : format(financials!.totalExpenses)}
            color="red"
          />
          <StatCard
            label="Total Revenue"
            value={loading ? '—' : format(financials!.totalRevenue)}
            color="green"
          />
          <StatCard
            label="Capital Funded"
            value={loading ? '—' : format(financials!.totalFounded)}
            color="blue"
          />
          <StatCard
            label="Net Position"
            value={loading ? '—' : format(netPosition)}
            color={!loading && netPosition >= 0 ? 'green' : 'red'}
            sub="Revenue + Funded − Expenses"
          />
        </div>
      </section>

      {/* Account Balances */}
      {bankBalances.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Account Balances</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {bankBalances.map(b => (
              <StatCard key={b.id} label={b.label} value={format(b.amount)} sub={b.status ?? undefined} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Currently In-House */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Currently In-House ({currentGuests.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {currentGuests.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No guests currently in-house.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[340px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Room</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Guest</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 hidden sm:table-cell">Check-Out</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentGuests.map(g => {
                      const balance = (g.amount_thb_stay ?? 0) - (g.payment ?? 0)
                      return (
                        <tr key={g.id}>
                          <td className="px-3 py-2 font-medium">#{g.room}</td>
                          <td className="px-3 py-2">{g.guest_name}</td>
                          <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">
                            {new Date(g.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {format(balance)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Check-ins */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Arriving in 7 Days ({upcomingGuests.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {upcomingGuests.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No arrivals in the next 7 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[300px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Room</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Guest</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Check-In</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 hidden sm:table-cell">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingGuests.map(g => (
                      <tr key={g.id}>
                        <td className="px-3 py-2 font-medium">#{g.room}</td>
                        <td className="px-3 py-2">{g.guest_name}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {new Date(g.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-3 py-2 text-right font-medium hidden sm:table-cell">
                          {format(g.amount_thb_stay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Tasks Summary */}
        <section className="lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Tasks Summary</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
            {[
              { label: 'Complete', color: 'text-green-600 bg-green-50' },
              { label: 'Ongoing',  color: 'text-blue-600 bg-blue-50' },
              { label: 'Pending',  color: 'text-yellow-600 bg-yellow-50' },
              { label: 'Blocked',  color: 'text-red-600 bg-red-50' },
            ].map(({ label, color }) => (
              <div key={label} className={`rounded-lg px-3 py-3 ${color}`}>
                <p className="text-2xl font-bold">{todosByStatus[label] ?? 0}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
