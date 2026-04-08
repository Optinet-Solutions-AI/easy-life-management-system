'use client'

import { useState, useMemo } from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import { SHAREHOLDERS, MONTHS } from '@/types'
import StatCard from '@/components/StatCard'

const TOTAL_ROOMS = 10

const OPEX_ORDER = [
  'Staff Costs', 'Rooms Department', 'Utilities', 'Maintenance & Repairs',
  'General & Admin', 'Insurance & Licenses', 'Rent / Lease', 'Financial Costs',
  'Sales & Marketing', 'Travel',
]

type Tab = 'financial' | 'funding' | 'budget' | 'kpis' | 'costs' | 'forecast' | 'profiles'

interface ExpenseRow { category: string | null; amount: number | null; currency?: string; payment_date: string | null }
interface RevenueRow { amount_thb: number | null; date: string }
interface ContributionRow { shareholder: string; amount_thb: number | null; amount_eur: number | null }
interface AccountRow { id: string; account_type: string; amount: number; notes?: string | null; updated_at?: string | null }
interface BudgetRevRow { year: number; month: number; room_name: string; amount_thb: number }
interface BudgetExpRow { year: number; month: number; category: string; item_name: string; amount_thb: number; expense_type: string }
interface GuestRow { check_in: string; check_out: string; amount_thb_stay: number | null; payment: number | null; room: number; guest_name: string }
interface ShareholderRow { id: string; name: string; share_percentage: number | null; amount_to_found_thb: number | null }

interface Props {
  expenses: ExpenseRow[]
  revenues: RevenueRow[]
  contributions: ContributionRow[]
  accountBalances: AccountRow[]
  budgetRevenue: BudgetRevRow[]
  budgetExpenses: BudgetExpRow[]
  guests: GuestRow[]
  shareholders: ShareholderRow[]
  currentYear: number
}

function Bar({ pct, color = 'bg-blue-500' }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

function VarCell({ budget, actual, invertGood = false }: { budget: number; actual: number; invertGood?: boolean }) {
  if (budget === 0 && actual === 0) return <td className="px-3 py-2 text-right text-slate-300 text-xs">—</td>
  const diff = actual - budget
  const pct = budget !== 0 ? (diff / budget) * 100 : null
  const isGood = invertGood ? diff <= 0 : diff >= 0
  return (
    <td className={`px-3 py-2 text-right text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {diff >= 0 ? '+' : ''}{Math.round(diff).toLocaleString()}
      {pct !== null && <span className="ml-1 opacity-60">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>}
    </td>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'financial', label: 'Financial Overview' },
  { id: 'funding', label: 'Funding & Investment' },
  { id: 'budget', label: 'Budget vs Actual' },
  { id: 'kpis', label: 'Business KPIs' },
  { id: 'costs', label: 'Cost Structure' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'profiles', label: 'Shareholder Profiles' },
]

export default function ShareholderDashClient({ expenses, revenues, contributions, accountBalances, budgetRevenue, budgetExpenses, guests, shareholders, currentYear }: Props) {
  const [tab, setTab] = useState<Tab>('financial')
  const { format } = useCurrency()

  const today = new Date()
  const currentMonth = today.getMonth()

  // ── Financials ──
  const totalRevenue = useMemo(() => revenues.reduce((s, r) => s + (r.amount_thb ?? 0), 0), [revenues])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0), [expenses])
  const totalFounded = useMemo(() => contributions.reduce((s, c) => s + (c.amount_thb ?? 0), 0), [contributions])
  const accountTotal = useMemo(() => accountBalances.reduce((s, b) => s + b.amount, 0), [accountBalances])
  const netPosition = totalRevenue + totalFounded - totalExpenses

  const monthlyRevExp = useMemo(() => MONTHS.map((label, mi) => ({
    label,
    revenue: revenues.filter(r => r.date && new Date(r.date).getFullYear() === currentYear && new Date(r.date).getMonth() === mi).reduce((s, r) => s + (r.amount_thb ?? 0), 0),
    expenses: expenses.filter(e => e.payment_date && new Date(e.payment_date).getFullYear() === currentYear && new Date(e.payment_date).getMonth() === mi).reduce((s, e) => s + Math.abs(e.amount ?? 0), 0),
  })), [revenues, expenses, currentYear])

  const maxMonthly = useMemo(() => Math.max(...monthlyRevExp.map(m => Math.max(m.revenue, m.expenses)), 1), [monthlyRevExp])

  // ── Funding ──
  const perShareholder = useMemo(() => SHAREHOLDERS.map(name => {
    const total = contributions.filter(c => c.shareholder === name).reduce((s, c) => s + (c.amount_thb ?? 0), 0)
    const shData = shareholders.find(s => s.name === name)
    return { name, total, agreed: shData?.amount_to_found_thb ?? 0, pct: shData?.share_percentage ?? 25 }
  }), [contributions, shareholders])

  // ── Budget vs Actual (P&L) ──
  const yearRevenue = budgetRevenue.filter(r => r.year === currentYear)
  const yearExpenses = budgetExpenses.filter(e => e.year === currentYear)

  const actRevYear = useMemo(() => revenues.filter(r => r.date && new Date(r.date).getFullYear() === currentYear).reduce((s, r) => s + (r.amount_thb ?? 0), 0), [revenues, currentYear])

  const actExpByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      if (!e.payment_date) return
      const d = new Date(e.payment_date)
      if (d.getFullYear() !== currentYear) return
      const cat = e.category ?? 'Uncategorized'
      const amt = Math.abs(e.amount ?? 0) * ((e.currency === 'EUR') ? 37 : 1)
      map[cat] = (map[cat] ?? 0) + amt
    })
    return map
  }, [expenses, currentYear])

  const plData = useMemo(() => {
    // Revenue by room
    const rooms = [...new Set(yearRevenue.map(r => r.room_name))].sort()
    const revenueRows = rooms.map(room => ({
      name: room,
      budget: yearRevenue.filter(r => r.room_name === room).reduce((s, r) => s + r.amount_thb, 0),
    }))
    const budTotalRev = revenueRows.reduce((s, r) => s + r.budget, 0)

    // OPEX categories (ordered)
    const presentOpex = OPEX_ORDER.filter(cat => yearExpenses.some(e => e.expense_type === 'OPEX' && e.category === cat))
    const extraOpex = [...new Set(yearExpenses.filter(e => e.expense_type === 'OPEX').map(e => e.category))].filter(c => !OPEX_ORDER.includes(c))
    const opexCategories = [...presentOpex, ...extraOpex]

    const opexRows = opexCategories.map(cat => ({
      category: cat,
      budget: yearExpenses.filter(e => e.expense_type === 'OPEX' && e.category === cat).reduce((s, e) => s + e.amount_thb, 0),
      actual: actExpByCategory[cat] ?? 0,
    }))
    const budTotalOpex = opexRows.reduce((s, r) => s + r.budget, 0)
    const actTotalOpex = opexRows.reduce((s, r) => s + r.actual, 0)

    // CAPEX items
    const capexItems = [...new Set(yearExpenses.filter(e => e.expense_type === 'CAPEX').map(e => e.item_name))]
    const capexRows = capexItems.map(item => ({
      name: item,
      budget: yearExpenses.filter(e => e.expense_type === 'CAPEX' && e.item_name === item).reduce((s, e) => s + e.amount_thb, 0),
      actual: actExpByCategory[item] ?? 0,
    }))
    const budTotalCapex = capexRows.reduce((s, r) => s + r.budget, 0)
    const actTotalCapex = capexRows.reduce((s, r) => s + r.actual, 0)

    return {
      revenueRows, budTotalRev, actTotalRev: actRevYear,
      opexRows, budTotalOpex, actTotalOpex,
      capexRows, budTotalCapex, actTotalCapex,
      budNetResult: budTotalRev - budTotalOpex - budTotalCapex,
      actNetResult: actRevYear - actTotalOpex - actTotalCapex,
    }
  }, [yearRevenue, yearExpenses, actExpByCategory, actRevYear])

  // ── Business KPIs (current month) ──
  const kpis = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    const daysInMonth = monthEnd.getDate()
    const monthGuests = guests.filter(g => new Date(g.check_in) <= monthEnd && new Date(g.check_out) >= monthStart)
    let occupiedNights = 0
    for (const g of monthGuests) {
      const s = new Date(Math.max(new Date(g.check_in).getTime(), monthStart.getTime()))
      const e = new Date(Math.min(new Date(g.check_out).getTime(), monthEnd.getTime()))
      occupiedNights += Math.max(0, Math.ceil((e.getTime() - s.getTime()) / 86400000))
    }
    const monthRevenue = monthGuests.reduce((s, g) => s + (g.amount_thb_stay ?? 0), 0)
    const totalAvail = TOTAL_ROOMS * daysInMonth
    return {
      occupancyPct: totalAvail > 0 ? (occupiedNights / totalAvail) * 100 : 0,
      adr: occupiedNights > 0 ? monthRevenue / occupiedNights : 0,
      revpar: totalAvail > 0 ? monthRevenue / totalAvail : 0,
      avgStay: monthGuests.length > 0 ? occupiedNights / monthGuests.length : 0,
      bookings: monthGuests.length,
    }
  }, [guests, currentYear, currentMonth])

  const monthlyKpis = useMemo(() => MONTHS.map((label, mi) => {
    const start = new Date(currentYear, mi, 1)
    const end = new Date(currentYear, mi + 1, 0)
    const days = end.getDate()
    const mg = guests.filter(g => new Date(g.check_in) <= end && new Date(g.check_out) >= start)
    let nights = 0
    for (const g of mg) {
      const s = new Date(Math.max(new Date(g.check_in).getTime(), start.getTime()))
      const e = new Date(Math.min(new Date(g.check_out).getTime(), end.getTime()))
      nights += Math.max(0, Math.ceil((e.getTime() - s.getTime()) / 86400000))
    }
    const rev = mg.reduce((s, g) => s + (g.amount_thb_stay ?? 0), 0)
    const avail = TOTAL_ROOMS * days
    return { label, occupancy: avail > 0 ? (nights / avail) * 100 : 0, adr: nights > 0 ? rev / nights : 0, revpar: avail > 0 ? rev / avail : 0 }
  }), [guests, currentYear])

  // ── Cost Structure ──
  const costByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => { const cat = e.category ?? 'Other'; map[cat] = (map[cat] ?? 0) + Math.abs(e.amount ?? 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ cat, amt, pct: totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0 }))
  }, [expenses, totalExpenses])

  // ── Forecast ──
  const forecast = useMemo(() => {
    const futureGuests = guests.filter(g => new Date(g.check_in) > today)
    const futureRevenue = futureGuests.reduce((s, g) => s + (g.amount_thb_stay ?? 0), 0)
    const remainingBudRev = budgetRevenue.filter(r => r.month > currentMonth + 1).reduce((s, r) => s + r.amount_thb, 0)
    const remainingBudExp = budgetExpenses.filter(e => e.month > currentMonth + 1).reduce((s, e) => s + e.amount_thb, 0)
    return { futureRevenue, remainingBudRev, remainingBudExp, projectedCash: accountTotal + futureRevenue - remainingBudExp }
  }, [guests, budgetRevenue, budgetExpenses, accountTotal, currentMonth])

  const fmt = (n: number) => Math.round(n).toLocaleString()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dream-T Management System</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Shareholder Dashboard</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Financial Overview ── */}
      {tab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={format(totalRevenue)} color="green" />
            <StatCard label="Total Expenses" value={format(totalExpenses)} color="red" />
            <StatCard label="Net Position" value={format(netPosition)} color={netPosition >= 0 ? 'green' : 'red'} sub="Rev + Founded − Exp" />
            <StatCard label="Account Total" value={format(accountTotal)} color="blue" />
          </div>

          {/* Monthly chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{currentYear} — Monthly Revenue vs Expenses</h3>
            <div className="space-y-3">
              {monthlyRevExp.map(m => (
                <div key={m.label} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center text-xs">
                  <span className="text-slate-500 font-medium">{m.label}</span>
                  <div className="space-y-1">
                    <Bar pct={(m.revenue / maxMonthly) * 100} color="bg-green-500" />
                    <Bar pct={(m.expenses / maxMonthly) * 100} color="bg-red-400" />
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-green-600">{m.revenue > 0 ? format(m.revenue) : '—'}</p>
                    <p className="text-red-500">{m.expenses > 0 ? format(m.expenses) : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500 inline-block" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Expenses</span>
            </div>
          </div>

          {/* Account balances */}
          {accountBalances.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Account Balances</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {accountBalances.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{b.account_type}</p>
                      {b.notes && <p className="text-xs text-slate-400">{b.notes}</p>}
                    </div>
                    <p className="font-semibold text-slate-900">{format(b.amount)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg col-span-full sm:col-span-1">
                  <p className="text-sm font-semibold text-blue-700">Total</p>
                  <p className="font-bold text-blue-700">{format(accountTotal)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Funding & Investment ── */}
      {tab === 'funding' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Capital Funded" value={format(totalFounded)} color="blue" />
            <StatCard label="Shareholders" value={`${SHAREHOLDERS.length}`} color="default" sub="25% each" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Contribution per Shareholder</h3>
            <div className="space-y-5">
              {perShareholder.map(({ name, total, agreed, pct }) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{name}</span>
                      <span className="ml-2 text-xs text-slate-400">{pct}% ownership</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{format(total)}</span>
                  </div>
                  <Bar pct={agreed > 0 ? (total / agreed) * 100 : 100} color="bg-blue-500" />
                  {agreed > 0 && (
                    <p className="text-xs text-slate-400 mt-1">Agreed: {format(agreed)} — {agreed > 0 ? ((total / agreed) * 100).toFixed(0) : 0}% funded</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Budget vs Actual (P&L) ── */}
      {tab === 'budget' && (
        <div className="space-y-4">
          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Budget Revenue" value={format(plData.budTotalRev)} color="default" sub={`${currentYear} plan`} />
            <StatCard label="Actual Revenue" value={format(plData.actTotalRev)} color="green" />
            <StatCard label="Budget OPEX" value={format(plData.budTotalOpex)} color="default" />
            <StatCard label="Budget Net Result" value={format(plData.budNetResult)} color={plData.budNetResult >= 0 ? 'green' : 'red'} />
          </div>

          {/* P&L table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-4 py-3 font-semibold text-sm">Item</th>
                  <th className="text-right px-3 py-3 font-semibold text-sm">Budget {currentYear}</th>
                  <th className="text-right px-3 py-3 font-semibold text-sm">Actual YTD</th>
                  <th className="text-right px-3 py-3 font-semibold text-sm">Variance</th>
                  <th className="text-right px-4 py-3 font-semibold text-sm">Var %</th>
                </tr>
              </thead>
              <tbody>
                {/* REVENUE section */}
                <tr className="bg-green-50 border-t border-green-200">
                  <td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-green-700">Revenue</td>
                </tr>
                {plData.revenueRows.map(r => (
                  <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600 text-xs pl-7">{r.name}</td>
                    <td className="px-3 py-2 text-right text-xs text-slate-600">{r.budget > 0 ? fmt(r.budget) : '—'}</td>
                    <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                    <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400">—</td>
                  </tr>
                ))}
                <tr className="bg-green-50 border-t-2 border-green-300">
                  <td className="px-4 py-2.5 font-bold text-green-800 text-sm pl-7">Total Revenue</td>
                  <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmt(plData.budTotalRev)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmt(plData.actTotalRev)}</td>
                  <VarCell budget={plData.budTotalRev} actual={plData.actTotalRev} />
                  {plData.budTotalRev > 0
                    ? <td className={`px-4 py-2.5 text-right text-xs font-medium ${plData.actTotalRev >= plData.budTotalRev ? 'text-green-600' : 'text-red-500'}`}>
                        {((plData.actTotalRev / plData.budTotalRev) * 100).toFixed(1)}%
                      </td>
                    : <td className="px-4 py-2.5 text-right text-xs text-slate-300">—</td>
                  }
                </tr>

                {/* OPEX section */}
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Operating Expenses (OPEX)</td>
                </tr>
                {plData.opexRows.map(r => (
                  <tr key={r.category} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700 text-sm pl-7">{r.category}</td>
                    <td className="px-3 py-2 text-right text-xs text-slate-600">{r.budget > 0 ? fmt(r.budget) : '—'}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-slate-800">{r.actual > 0 ? fmt(r.actual) : '—'}</td>
                    <VarCell budget={r.budget} actual={r.actual} invertGood />
                    {r.budget > 0
                      ? <td className={`px-4 py-2 text-right text-xs font-medium ${r.actual <= r.budget ? 'text-green-600' : 'text-red-500'}`}>
                          {((r.actual / r.budget) * 100).toFixed(1)}%
                        </td>
                      : <td className="px-4 py-2 text-right text-xs text-slate-300">—</td>
                    }
                  </tr>
                ))}
                <tr className="bg-slate-100 border-t-2 border-slate-400">
                  <td className="px-4 py-2.5 font-bold text-slate-800 pl-7">Total OPEX</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-700">{fmt(plData.budTotalOpex)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">{plData.actTotalOpex > 0 ? fmt(plData.actTotalOpex) : '—'}</td>
                  <VarCell budget={plData.budTotalOpex} actual={plData.actTotalOpex} invertGood />
                  {plData.budTotalOpex > 0
                    ? <td className={`px-4 py-2.5 text-right text-xs font-medium ${plData.actTotalOpex <= plData.budTotalOpex ? 'text-green-600' : 'text-red-500'}`}>
                        {((plData.actTotalOpex / plData.budTotalOpex) * 100).toFixed(1)}%
                      </td>
                    : <td className="px-4 py-2.5 text-right text-xs text-slate-300">—</td>
                  }
                </tr>

                {/* CAPEX section */}
                {plData.capexRows.length > 0 && (
                  <>
                    <tr className="bg-orange-50 border-t-2 border-orange-200">
                      <td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-700">Capital Expenses (CAPEX)</td>
                    </tr>
                    {plData.capexRows.map(r => (
                      <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700 text-xs pl-7">{r.name}</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-600">{r.budget > 0 ? fmt(r.budget) : '—'}</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                        <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                        <td className="px-4 py-2 text-right text-xs text-slate-400">—</td>
                      </tr>
                    ))}
                    <tr className="bg-orange-50 border-t-2 border-orange-300">
                      <td className="px-4 py-2.5 font-bold text-orange-800 pl-7">Total CAPEX</td>
                      <td className="px-3 py-2.5 text-right font-bold text-orange-700">{fmt(plData.budTotalCapex)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-400">—</td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-400">—</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400">—</td>
                    </tr>
                  </>
                )}

                {/* Net Result */}
                <tr className={`border-t-2 border-slate-500 ${plData.budNetResult >= 0 ? 'bg-green-100' : 'bg-red-50'}`}>
                  <td className="px-4 py-3 font-bold text-slate-900 text-base">NET RESULT</td>
                  <td className={`px-3 py-3 text-right font-bold ${plData.budNetResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(plData.budNetResult)}</td>
                  <td className={`px-3 py-3 text-right font-bold ${plData.actNetResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(plData.actNetResult)}</td>
                  <VarCell budget={plData.budNetResult} actual={plData.actNetResult} />
                  <td className="px-4 py-3 text-right text-xs text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">Actual figures use year-to-date data. Actual by OPEX category matched against expense category names. CAPEX actuals not separately tracked.</p>
        </div>
      )}

      {/* ── Tab: Business KPIs ── */}
      {tab === 'kpis' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">Current month — {today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Occupancy" value={`${kpis.occupancyPct.toFixed(1)}%`} color="blue" sub={`${TOTAL_ROOMS} rooms`} />
            <StatCard label="ADR" value={format(kpis.adr)} color="green" sub="Avg Daily Rate" />
            <StatCard label="RevPAR" value={format(kpis.revpar)} color="green" sub="Rev per Avail Room" />
            <StatCard label="Avg Stay" value={`${kpis.avgStay.toFixed(1)} nights`} color="default" sub={`${kpis.bookings} bookings`} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Month</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Occupancy %</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">ADR</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">RevPAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyKpis.map((m, i) => (
                  <tr key={m.label} className={`hover:bg-slate-50 ${i === currentMonth ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{m.label} {i === currentMonth && <span className="ml-1 text-xs text-blue-500">(current)</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.occupancy >= 70 ? 'bg-green-100 text-green-700' : m.occupancy >= 40 ? 'bg-yellow-100 text-yellow-700' : m.occupancy > 0 ? 'bg-slate-100 text-slate-600' : 'text-slate-300'}`}>
                        {m.occupancy > 0 ? `${m.occupancy.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm">{m.adr > 0 ? format(m.adr) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-sm">{m.revpar > 0 ? format(m.revpar) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Cost Structure ── */}
      {tab === 'costs' && (
        <div className="space-y-6">
          <StatCard label="Total Expenses" value={format(totalExpenses)} color="red" />
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Breakdown by Category</h3>
            <div className="space-y-4">
              {costByCategory.map(({ cat, amt, pct }) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{cat}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">{format(amt)}</span>
                      <span className="ml-2 text-xs text-slate-400">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Bar pct={pct} color="bg-red-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Forecast ── */}
      {tab === 'forecast' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">Based on confirmed bookings and {currentYear} budget for remaining months</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard label="Future Confirmed Revenue" value={format(forecast.futureRevenue)} color="green" sub="From booked stays" />
            <StatCard label="Remaining Budget Revenue" value={format(forecast.remainingBudRev)} color="blue" sub="Budget plan" />
            <StatCard label="Remaining Budget Expenses" value={format(forecast.remainingBudExp)} color="red" sub="Budget plan" />
            <StatCard label="Projected Cash Position" value={format(forecast.projectedCash)} color={forecast.projectedCash >= 0 ? 'green' : 'red'} sub="Accounts + future rev − budget exp" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Bookings</h3>
            {guests.filter(g => new Date(g.check_in) > today).length === 0 ? (
              <p className="text-sm text-slate-400">No future bookings recorded.</p>
            ) : (
              <div className="space-y-2">
                {guests.filter(g => new Date(g.check_in) > today).sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()).map((g, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{g.guest_name}</p>
                      <p className="text-xs text-slate-400">Room {g.room} · {new Date(g.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} → {new Date(g.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{format(g.amount_thb_stay)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Shareholder Profiles ── */}
      {tab === 'profiles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHAREHOLDERS.map((name, i) => {
            const sh = perShareholder.find(s => s.name === name)
            const colors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600']
            return (
              <div key={name} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white font-bold text-xl shrink-0`}>
                    {name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900">{name}</h3>
                    <p className="text-xs text-slate-400 mb-2">Founding Shareholder</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-400">Ownership</p>
                        <p className="font-semibold text-slate-800">{sh?.pct ?? 25}%</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-400">Contributed</p>
                        <p className="font-semibold text-slate-800">{format(sh?.total ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Bar pct={sh?.agreed ? ((sh?.total ?? 0) / sh.agreed) * 100 : 100} color={colors[i % colors.length].replace('bg-', 'bg-')} />
                  <p className="text-xs text-slate-400 mt-1">{sh?.agreed ? `${format(sh.total)} of ${format(sh.agreed)} agreed` : 'Profile details to be added'}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
