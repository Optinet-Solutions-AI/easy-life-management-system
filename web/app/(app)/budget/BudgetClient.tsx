'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Settings2, Table2, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MONTHS, formatTHB } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import type { BudgetRevenue, BudgetExpense, BudgetRent, BudgetRoomSetup } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'
import { usePermissions } from '@/context/PermissionsContext'

type Tab = 'setup' | 'input' | 'control'
type InputSection = 'revenue' | 'expenses' | 'rent'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm = Record<string, any>

interface ActualRevRow { amount_thb: number | null; date: string }
interface ActualExpRow { amount: number | null; currency: string; payment_date: string | null; category?: string | null }

const ROOMS_LIST = [
  'Room 1 - Renovated - Single', 'Room 2 - Renovated - Single', 'Room 3 - Renovated - Single',
  'Room 4 - Renovated - Single', 'Room 5 - Renovated - Single',
  'Room 6', 'Room 7', 'Room 8', 'Room 9', 'Room 10',
]

function varPct(budget: number, actual: number): number | null {
  if (budget === 0) return null
  return ((actual - budget) / budget) * 100
}

function VarBadge({ budget, actual, invertGood = false }: { budget: number; actual: number; invertGood?: boolean }) {
  const diff = actual - budget
  const pct = varPct(budget, actual)
  if (budget === 0 && actual === 0) return <span className="text-slate-300 text-xs">—</span>
  // For expenses: positive diff = over budget = bad; for revenue/result: positive diff = good
  const isGood = invertGood ? diff <= 0 : diff >= 0
  const cls = isGood ? 'text-green-600' : 'text-red-600'
  return (
    <span className={`text-xs font-medium ${cls}`}>
      {diff >= 0 ? '+' : ''}{formatTHB(diff).replace('฿', '')}
      {pct != null && <span className="ml-1 opacity-70">({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>}
    </span>
  )
}

export default function BudgetClient({
  initialRevenue, initialExpenses, initialRent, initialRoomSetup,
  actualRevenue: propActualRev, actualExpenses: propActualExp,
}: {
  initialRevenue: BudgetRevenue[]
  initialExpenses: BudgetExpense[]
  initialRent: BudgetRent[]
  initialRoomSetup: BudgetRoomSetup[]
  actualRevenue: ActualRevRow[]
  actualExpenses: ActualExpRow[]
}) {
  const { format } = useCurrency()
  const { can } = usePermissions()
  const canAdd    = can('budget', 'add')
  const canEdit   = can('budget', 'edit')
  const canDelete = can('budget', 'delete')
  const [tab, setTab] = useState<Tab>('control')
  const [inputSection, setInputSection] = useState<InputSection>('revenue')
  const [revenue, setRevenue] = useState(initialRevenue)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [rent, setRent] = useState(initialRent)
  const [roomSetup, setRoomSetup] = useState(initialRoomSetup)
  const [year, setYear] = useState(new Date().getFullYear())
  const [openModal, setOpenModal] = useState<null | 'revenue' | 'expense' | 'rent' | 'setup'>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AnyForm>({})
  const [saving, setSaving] = useState(false)
  const [controlView, setControlView] = useState<'monthly' | 'pnl'>('pnl')

  // ── Budget data for selected year ──────────────────────────────────────────
  const yearRevenue = revenue.filter(r => r.year === year)
  const yearExpenses = expenses.filter(e => e.year === year)
  const yearSetup = roomSetup.filter(s => s.year === year)

  const budMonthlyRevenue = MONTHS.map((_, mi) =>
    yearRevenue.filter(r => r.month === mi + 1).reduce((s, r) => s + r.amount_thb, 0))
  const budMonthlyOpex = MONTHS.map((_, mi) =>
    yearExpenses.filter(e => e.month === mi + 1 && e.expense_type === 'OPEX').reduce((s, e) => s + e.amount_thb, 0))
  const budMonthlyCapex = MONTHS.map((_, mi) =>
    yearExpenses.filter(e => e.month === mi + 1 && e.expense_type === 'CAPEX').reduce((s, e) => s + e.amount_thb, 0))
  const budMonthlyResult = MONTHS.map((_, mi) => budMonthlyRevenue[mi] - budMonthlyOpex[mi] - budMonthlyCapex[mi])

  const budTotalRev = budMonthlyRevenue.reduce((s, v) => s + v, 0)
  const budTotalOpex = budMonthlyOpex.reduce((s, v) => s + v, 0)
  const budTotalCapex = budMonthlyCapex.reduce((s, v) => s + v, 0)
  const budTotalResult = budTotalRev - budTotalOpex - budTotalCapex

  // ── Actual data for selected year ──────────────────────────────────────────
  const actMonthlyRevenue = useMemo(() => MONTHS.map((_, mi) =>
    propActualRev
      .filter(r => { const d = new Date(r.date); return d.getFullYear() === year && d.getMonth() === mi })
      .reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  ), [propActualRev, year])

  const actMonthlyExp = useMemo(() => MONTHS.map((_, mi) =>
    propActualExp
      .filter(e => {
        if (!e.payment_date) return false
        const d = new Date(e.payment_date)
        return d.getFullYear() === year && d.getMonth() === mi
      })
      .reduce((s, e) => {
        const amt = e.amount ?? 0
        return s + (e.currency === 'EUR' ? amt * 37 : amt)
      }, 0)
  ), [propActualExp, year])

  const actMonthlyResult = MONTHS.map((_, mi) => actMonthlyRevenue[mi] - actMonthlyExp[mi])

  const actTotalRev = actMonthlyRevenue.reduce((s, v) => s + v, 0)
  const actTotalExp = actMonthlyExp.reduce((s, v) => s + v, 0)
  const actTotalResult = actTotalRev - actTotalExp

  // ── P&L breakdown data ─────────────────────────────────────────────────────
  const OPEX_ORDER = [
    'Staff Costs', 'Rooms Department', 'Utilities', 'Maintenance & Repairs',
    'General & Admin', 'Insurance & Licenses', 'Rent / Lease', 'Financial Costs',
    'Sales & Marketing', 'Travel',
  ]

  const actExpByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    propActualExp.forEach(e => {
      if (!e.payment_date) return
      const d = new Date(e.payment_date)
      if (d.getFullYear() !== year) return
      const cat = e.category ?? 'Uncategorized'
      const amt = Math.abs(e.amount ?? 0) * (e.currency === 'EUR' ? 37 : 1)
      map[cat] = (map[cat] ?? 0) + amt
    })
    return map
  }, [propActualExp, year])

  const plData = useMemo(() => {
    const rooms = [...new Set(yearRevenue.map(r => r.room_name))].sort()
    const revenueRows = rooms.map(room => ({
      name: room,
      budget: yearRevenue.filter(r => r.room_name === room).reduce((s, r) => s + r.amount_thb, 0),
    }))

    const presentOpex = OPEX_ORDER.filter(cat => yearExpenses.some(e => e.expense_type === 'OPEX' && e.category === cat))
    const extraOpex = [...new Set(yearExpenses.filter(e => e.expense_type === 'OPEX').map(e => e.category))].filter(c => !OPEX_ORDER.includes(c))
    const opexCategories = [...presentOpex, ...extraOpex]

    const opexRows = opexCategories.map(cat => ({
      category: cat,
      budget: yearExpenses.filter(e => e.expense_type === 'OPEX' && e.category === cat).reduce((s, e) => s + e.amount_thb, 0),
      actual: actExpByCategory[cat] ?? 0,
    }))
    const budTotalOpexPl = opexRows.reduce((s, r) => s + r.budget, 0)
    const actTotalOpexPl = opexRows.reduce((s, r) => s + r.actual, 0)

    const capexItems = [...new Set(yearExpenses.filter(e => e.expense_type === 'CAPEX').map(e => e.item_name))]
    const capexRows = capexItems.map(item => ({
      name: item,
      budget: yearExpenses.filter(e => e.expense_type === 'CAPEX' && e.item_name === item).reduce((s, e) => s + e.amount_thb, 0),
    }))
    const budTotalCapexPl = capexRows.reduce((s, r) => s + r.budget, 0)

    return {
      revenueRows,
      budTotalRev: revenueRows.reduce((s, r) => s + r.budget, 0),
      opexRows, budTotalOpexPl, actTotalOpexPl,
      capexRows, budTotalCapexPl,
    }
  }, [yearRevenue, yearExpenses, actExpByCategory])

  const fmt = (n: number) => Math.round(n).toLocaleString()

  // ── Save handlers ───────────────────────────────────────────────────────────
  async function saveRevenue() {
    setSaving(true)
    if (editingId) {
      const { data } = await supabase.from('budget_revenue').update(form).eq('id', editingId).select().single()
      if (data) setRevenue(prev => prev.map(r => r.id === editingId ? data : r))
    } else {
      const { data } = await supabase.from('budget_revenue').insert(form).select().single()
      if (data) setRevenue(prev => [...prev, data])
    }
    setSaving(false); setOpenModal(null)
  }

  async function saveExpense() {
    setSaving(true)
    if (editingId) {
      const { data } = await supabase.from('budget_expenses').update(form).eq('id', editingId).select().single()
      if (data) setExpenses(prev => prev.map(e => e.id === editingId ? data : e))
    } else {
      const { data } = await supabase.from('budget_expenses').insert(form).select().single()
      if (data) setExpenses(prev => [...prev, data])
    }
    setSaving(false); setOpenModal(null)
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this budget item?')) return
    await supabase.from('budget_expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function saveRent() {
    setSaving(true)
    if (editingId) {
      const { data } = await supabase.from('budget_rent').update(form).eq('id', editingId).select().single()
      if (data) setRent(prev => prev.map(r => r.id === editingId ? data : r))
    } else {
      const { data } = await supabase.from('budget_rent').insert(form).select().single()
      if (data) setRent(prev => [...prev, data])
    }
    setSaving(false); setOpenModal(null)
  }

  async function saveSetup() {
    if (!form.room_name) return alert('Room is required.')
    setSaving(true)
    const payload = {
      year: form.year ?? year,
      room_name: form.room_name,
      high_season_rate_thb: form.high_season_rate_thb ?? null,
      low_season_rate_thb: form.low_season_rate_thb ?? null,
      target_occupancy_pct: form.target_occupancy_pct ?? null,
      notes: form.notes ?? null,
    }
    if (editingId) {
      const { data } = await supabase.from('budget_room_setup').update(payload).eq('id', editingId).select().single()
      if (data) setRoomSetup(prev => prev.map(s => s.id === editingId ? data : s))
    } else {
      const { data } = await supabase.from('budget_room_setup').insert(payload).select().single()
      if (data) setRoomSetup(prev => [...prev, data])
    }
    setSaving(false); setOpenModal(null)
  }

  async function deleteSetup(id: string) {
    if (!confirm('Remove this room assumption?')) return
    await supabase.from('budget_room_setup').delete().eq('id', id)
    setRoomSetup(prev => prev.filter(s => s.id !== id))
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'setup', label: 'Setup', icon: <Settings2 size={14} /> },
    { id: 'input', label: 'Input', icon: <Table2 size={14} /> },
    { id: 'control', label: 'Control', icon: <BarChart3 size={14} /> },
  ]

  return (
    <>
      <PageHeader title="Budget" subtitle="Annual planning and budget vs actual control" />

      {/* Tab bar + year selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Year:</label>
          <select className="input w-auto" value={year} onChange={e => setYear(+e.target.value)}>
            {[2025, 2026, 2027, 2028].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── TAB 1: SETUP ────────────────────────────────────────────────────── */}
      {tab === 'setup' && (
        <>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600">Define room rate assumptions and target occupancy for <strong>{year}</strong>. These serve as planning references for the Input and Control tabs.</p>
            </div>
            {canAdd && (
              <button
                onClick={() => { setEditingId(null); setForm({ year, room_name: ROOMS_LIST[0], high_season_rate_thb: '', low_season_rate_thb: '', target_occupancy_pct: '', notes: '' }); setOpenModal('setup') }}
                className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                <Plus size={16} /> Add Room
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Room</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">High Season Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Season Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target Occupancy</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearSetup.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No assumptions set for {year}. Add room rates to get started.</td></tr>
                ) : yearSetup.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.room_name}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold">{s.high_season_rate_thb ? format(s.high_season_rate_thb) : '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{s.low_season_rate_thb ? format(s.low_season_rate_thb) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {s.target_occupancy_pct != null ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold">{s.target_occupancy_pct}%</span>
                          <span className="text-xs text-slate-400">occ.</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{s.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canEdit   && <button onClick={() => { setEditingId(s.id); setForm(s); setOpenModal('setup') }} className="text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>}
                        {canDelete && <button onClick={() => deleteSetup(s.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ADR reference */}
          {yearSetup.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {yearSetup.filter(s => s.high_season_rate_thb).map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 truncate">{s.room_name.split(' - ')[0]}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{format(s.high_season_rate_thb!)}<span className="text-xs font-normal text-slate-400 ml-1">high</span></p>
                  {s.low_season_rate_thb && <p className="text-xs text-slate-500">{format(s.low_season_rate_thb)} low</p>}
                  {s.target_occupancy_pct && <p className="text-xs text-blue-600 font-medium mt-0.5">{s.target_occupancy_pct}% occ. target</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: INPUT ────────────────────────────────────────────────────── */}
      {tab === 'input' && (
        <>
          {/* Inner section switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-5">
            {(['revenue', 'expenses', 'rent'] as InputSection[]).map(s => (
              <button key={s} onClick={() => setInputSection(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  inputSection === s ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {s === 'rent' ? 'Rent Schedule' : s === 'revenue' ? 'Revenue Matrix' : 'Expense Items'}
              </button>
            ))}
          </div>

          {/* Revenue Matrix */}
          {inputSection === 'revenue' && (
            <>
              {canAdd && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => { setEditingId(null); setForm({ year, month: 1, room_name: ROOMS_LIST[0], amount_thb: 0 }); setOpenModal('revenue') }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                    <Plus size={16} /> Add Entry
                  </button>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Room</th>
                      {MONTHS.map(m => <th key={m} className="text-right px-2 py-3 font-medium text-slate-600">{m}</th>)}
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ROOMS_LIST.map(room => {
                      const rowTotal = yearRevenue.filter(r => r.room_name === room).reduce((s, r) => s + r.amount_thb, 0)
                      return (
                        <tr key={room} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-sm whitespace-nowrap">{room}</td>
                          {MONTHS.map((_, mi) => {
                            const entry = yearRevenue.find(r => r.room_name === room && r.month === mi + 1)
                            return (
                              <td key={mi} className="px-2 py-2.5 text-right text-xs">
                                {entry ? (
                                  <button onClick={() => { setEditingId(entry.id); setForm(entry); setOpenModal('revenue') }}
                                    className="text-green-600 hover:underline">{format(entry.amount_thb).replace('฿', '')}</button>
                                ) : '—'}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5 text-right font-semibold text-green-600">{rowTotal > 0 ? format(rowTotal) : '—'}</td>
                        </tr>
                      )
                    })}
                    {/* Totals row */}
                    <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                      <td className="px-4 py-2.5 text-slate-700">Total</td>
                      {budMonthlyRevenue.map((v, i) => (
                        <td key={i} className="px-2 py-2.5 text-right text-xs text-green-700">{v > 0 ? format(v).replace('฿', '') : '—'}</td>
                      ))}
                      <td className="px-4 py-2.5 text-right text-green-700">{format(budTotalRev)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Expense Items */}
          {inputSection === 'expenses' && (
            <>
              {canAdd && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => { setEditingId(null); setForm({ year, month: 1, category: '', subcategory: '', item_name: '', amount_thb: 0, expense_type: 'OPEX' }); setOpenModal('expense') }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                    <Plus size={16} /> Add Budget Item
                  </button>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Category</th>
                      <th className="text-left px-4 py-3 font-medium">Item</th>
                      <th className="text-left px-4 py-3 font-medium">Month</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearExpenses.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-400">No expense items for {year}.</td></tr>
                    )}
                    {yearExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.expense_type === 'OPEX' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{e.expense_type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{e.category}</td>
                        <td className="px-4 py-2.5 font-medium">{e.item_name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{MONTHS[e.month - 1]}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{format(e.amount_thb)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            {canEdit   && <button onClick={() => { setEditingId(e.id); setForm(e); setOpenModal('expense') }} className="text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>}
                            {canDelete && <button onClick={() => deleteExpense(e.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Rent Schedule */}
          {inputSection === 'rent' && (
            <>
              {canAdd && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => { setEditingId(null); setForm({ year_number: rent.length + 1, rent_thb: 0 }); setOpenModal('rent') }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                    <Plus size={16} /> Add Year
                  </button>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Year #</th>
                      <th className="text-left px-4 py-3 font-medium">Label</th>
                      <th className="text-right px-4 py-3 font-medium">Annual Rent (THB)</th>
                      <th className="text-right px-4 py-3 font-medium">VAT (2.66%)</th>
                      <th className="text-right px-4 py-3 font-medium">Monthly</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rent.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-semibold">Year {r.year_number}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.year_label}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{format(r.rent_thb)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{format(r.rent_thb * 0.0266)}</td>
                        <td className="px-4 py-2.5 text-right">{format(r.rent_thb / 12)}</td>
                        <td className="px-4 py-2.5">
                          {canEdit && <button onClick={() => { setEditingId(r.id); setForm(r); setOpenModal('rent') }} className="text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── TAB 3: CONTROL ──────────────────────────────────────────────────── */}
      {tab === 'control' && (
        <>
          {/* KPI summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <StatCard label="Budget Revenue" value={format(budTotalRev)} color="default" sub={`${year}`} />
            <StatCard label="Actual Revenue" value={format(actTotalRev)} color="green" />
            <StatCard label="Budget Expenses" value={format(budTotalOpex + budTotalCapex)} color="default" />
            <StatCard label="Actual Expenses" value={format(actTotalExp)} color="red" />
            <StatCard label="Budget Result" value={format(budTotalResult)} color={budTotalResult >= 0 ? 'green' : 'red'} />
            <StatCard label="Actual Result" value={format(actTotalResult)} color={actTotalResult >= 0 ? 'green' : 'red'} />
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-4">
            <button onClick={() => setControlView('pnl')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${controlView === 'pnl' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>P&amp;L Breakdown</button>
            <button onClick={() => setControlView('monthly')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${controlView === 'monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Monthly Summary</button>
          </div>

          {/* P&L Breakdown view */}
          {controlView === 'pnl' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-auto mb-4">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left px-4 py-3 font-semibold">Item</th>
                    <th className="text-right px-3 py-3 font-semibold">Budget {year}</th>
                    <th className="text-right px-3 py-3 font-semibold">Actual YTD</th>
                    <th className="text-right px-4 py-3 font-semibold">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* REVENUE */}
                  <tr className="bg-green-50 border-t border-green-200">
                    <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-green-700">Revenue</td>
                  </tr>
                  {plData.revenueRows.map(r => (
                    <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600 text-xs pl-8">{r.name}</td>
                      <td className="px-3 py-2 text-right text-xs text-slate-600">{r.budget > 0 ? fmt(r.budget) : '—'}</td>
                      <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                      <td className="px-4 py-2 text-right text-xs text-slate-400">—</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50 border-t-2 border-green-300">
                    <td className="px-4 py-2.5 font-bold text-green-800 pl-8">Total Revenue</td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmt(plData.budTotalRev)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmt(actTotalRev)}</td>
                    <td className={`px-4 py-2.5 text-right text-xs font-medium ${actTotalRev >= plData.budTotalRev ? 'text-green-600' : 'text-red-500'}`}>
                      {actTotalRev - plData.budTotalRev >= 0 ? '+' : ''}{fmt(actTotalRev - plData.budTotalRev)}
                    </td>
                  </tr>

                  {/* OPEX */}
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Operating Expenses (OPEX)</td>
                  </tr>
                  {plData.opexRows.map(r => (
                    <tr key={r.category} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700 text-sm pl-8">{r.category}</td>
                      <td className="px-3 py-2 text-right text-xs text-slate-600">{r.budget > 0 ? fmt(r.budget) : '—'}</td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-slate-800">{r.actual > 0 ? fmt(r.actual) : '—'}</td>
                      <td className={`px-4 py-2 text-right text-xs font-medium ${r.actual <= r.budget ? 'text-green-600' : r.actual === 0 ? 'text-slate-300' : 'text-red-500'}`}>
                        {r.actual > 0 || r.budget > 0 ? `${r.actual - r.budget >= 0 ? '+' : ''}${fmt(r.actual - r.budget)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 border-t-2 border-slate-400">
                    <td className="px-4 py-2.5 font-bold text-slate-800 pl-8">Total OPEX</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-700">{fmt(plData.budTotalOpexPl)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{plData.actTotalOpexPl > 0 ? fmt(plData.actTotalOpexPl) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right text-xs font-medium ${plData.actTotalOpexPl <= plData.budTotalOpexPl ? 'text-green-600' : 'text-red-500'}`}>
                      {plData.actTotalOpexPl > 0 ? `${plData.actTotalOpexPl - plData.budTotalOpexPl >= 0 ? '+' : ''}${fmt(plData.actTotalOpexPl - plData.budTotalOpexPl)}` : '—'}
                    </td>
                  </tr>

                  {/* CAPEX */}
                  {plData.capexRows.length > 0 && (
                    <>
                      <tr className="bg-orange-50 border-t-2 border-orange-200">
                        <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-700">Capital Expenses (CAPEX)</td>
                      </tr>
                      {plData.capexRows.map(r => (
                        <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-700 text-xs pl-8">{r.name}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-600">{r.budget > 0 ? fmt(r.budget) : '—'}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                          <td className="px-4 py-2 text-right text-xs text-slate-400">—</td>
                        </tr>
                      ))}
                      <tr className="bg-orange-50 border-t-2 border-orange-300">
                        <td className="px-4 py-2.5 font-bold text-orange-800 pl-8">Total CAPEX</td>
                        <td className="px-3 py-2.5 text-right font-bold text-orange-700">{fmt(plData.budTotalCapexPl)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-400">—</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">—</td>
                      </tr>
                    </>
                  )}

                  {/* Net Result */}
                  {(() => {
                    const budNet = plData.budTotalRev - plData.budTotalOpexPl - plData.budTotalCapexPl
                    const actNet = actTotalRev - plData.actTotalOpexPl
                    return (
                      <tr className={`border-t-2 border-slate-500 ${budNet >= 0 ? 'bg-green-100' : 'bg-red-50'}`}>
                        <td className="px-4 py-3 font-bold text-slate-900 text-base">NET RESULT</td>
                        <td className={`px-3 py-3 text-right font-bold ${budNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(budNet)}</td>
                        <td className={`px-3 py-3 text-right font-bold ${actNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(actNet)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-medium ${actNet >= budNet ? 'text-green-600' : 'text-red-500'}`}>
                          {actNet - budNet >= 0 ? '+' : ''}{fmt(actNet - budNet)}
                        </td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
              <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">Actual OPEX matched by expense category name. CAPEX actuals not separately tracked. EUR expenses converted at 37 THB.</p>
            </div>
          )}

          {/* Monthly comparison table */}
          {controlView === 'monthly' && <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Budget vs Actual — {year}</p>
              <p className="text-xs text-slate-400">Expenses: actual amounts converted at 1 EUR = 37 THB</p>
            </div>
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Month</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bud Rev</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Act Rev</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rev Var</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bud Exp</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Act Exp</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Exp Var</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bud Result</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Act Result</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Res Var</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MONTHS.map((m, mi) => {
                  const budRev = budMonthlyRevenue[mi]
                  const actRev = actMonthlyRevenue[mi]
                  const budExp = budMonthlyOpex[mi] + budMonthlyCapex[mi]
                  const actExp = actMonthlyExp[mi]
                  const budRes = budRev - budExp
                  const actRes = actRev - actExp
                  const allZero = budRev === 0 && actRev === 0 && budExp === 0 && actExp === 0
                  return (
                    <tr key={m} className={`hover:bg-slate-50 ${allZero ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{m}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600">{budRev > 0 ? format(budRev).replace('฿', '') : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-800">{actRev > 0 ? format(actRev).replace('฿', '') : '—'}</td>
                      <td className="px-3 py-2.5 text-right"><VarBadge budget={budRev} actual={actRev} /></td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600">{budExp > 0 ? format(budExp).replace('฿', '') : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-800">{actExp > 0 ? format(actExp).replace('฿', '') : '—'}</td>
                      <td className="px-3 py-2.5 text-right"><VarBadge budget={budExp} actual={actExp} invertGood /></td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600">{budRes !== 0 ? format(budRes).replace('฿', '') : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-medium text-slate-800">{actRes !== 0 ? format(actRes).replace('฿', '') : '—'}</td>
                      <td className="px-4 py-2.5 text-right"><VarBadge budget={budRes} actual={actRes} /></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                <tr className="font-bold">
                  <td className="px-4 py-3 text-slate-800">TOTAL</td>
                  <td className="px-3 py-3 text-right text-xs text-slate-700">{format(budTotalRev).replace('฿', '')}</td>
                  <td className="px-3 py-3 text-right text-xs text-slate-900">{format(actTotalRev).replace('฿', '')}</td>
                  <td className="px-3 py-3 text-right"><VarBadge budget={budTotalRev} actual={actTotalRev} /></td>
                  <td className="px-3 py-3 text-right text-xs text-slate-700">{format(budTotalOpex + budTotalCapex).replace('฿', '')}</td>
                  <td className="px-3 py-3 text-right text-xs text-slate-900">{format(actTotalExp).replace('฿', '')}</td>
                  <td className="px-3 py-3 text-right"><VarBadge budget={budTotalOpex + budTotalCapex} actual={actTotalExp} invertGood /></td>
                  <td className="px-3 py-3 text-right text-xs text-slate-700">{format(budTotalResult).replace('฿', '')}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-900">{format(actTotalResult).replace('฿', '')}</td>
                  <td className="px-4 py-3 text-right"><VarBadge budget={budTotalResult} actual={actTotalResult} /></td>
                </tr>
              </tfoot>
            </table>
          </div>}
        </>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {openModal === 'setup' && (
        <Modal title={editingId ? 'Edit Room Assumption' : 'Add Room Assumption'} onClose={() => setOpenModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Year</label>
              <select className="input" value={(form.year as number) ?? year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}>
                {[2025, 2026, 2027, 2028].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div><label className="label">Room</label>
              <select className="input" value={(form.room_name as string) ?? ''} onChange={e => setForm(f => ({ ...f, room_name: e.target.value }))}>
                {ROOMS_LIST.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="label">High Season Rate (THB/night)</label><input type="number" step="100" min="0" className="input" value={(form.high_season_rate_thb as number) ?? ''} onChange={e => setForm(f => ({ ...f, high_season_rate_thb: e.target.value ? +e.target.value : null }))} /></div>
            <div><label className="label">Low Season Rate (THB/night)</label><input type="number" step="100" min="0" className="input" value={(form.low_season_rate_thb as number) ?? ''} onChange={e => setForm(f => ({ ...f, low_season_rate_thb: e.target.value ? +e.target.value : null }))} /></div>
            <div><label className="label">Target Occupancy %</label><input type="number" step="1" min="0" max="100" className="input" placeholder="e.g. 75" value={(form.target_occupancy_pct as number) ?? ''} onChange={e => setForm(f => ({ ...f, target_occupancy_pct: e.target.value ? +e.target.value : null }))} /></div>
            <div><label className="label">Notes</label><input className="input" value={(form.notes as string) ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpenModal(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={saveSetup} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {openModal === 'revenue' && (
        <Modal title={editingId ? 'Edit Revenue Entry' : 'Add Revenue Entry'} onClose={() => setOpenModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Year</label><input type="number" className="input" value={(form.year as number) ?? year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))} /></div>
            <div><label className="label">Month</label>
              <select className="input" value={(form.month as number) ?? 1} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">Room</label>
              <select className="input" value={(form.room_name as string) ?? ''} onChange={e => setForm(f => ({ ...f, room_name: e.target.value }))}>
                {ROOMS_LIST.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="label">Amount (THB)</label><input type="number" className="input" value={(form.amount_thb as number) ?? 0} onChange={e => setForm(f => ({ ...f, amount_thb: +e.target.value }))} /></div>
            <div><label className="label">Season</label><input className="input" placeholder="e.g. High, Low" value={(form.season as string) ?? ''} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpenModal(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={saveRevenue} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {openModal === 'expense' && (
        <Modal title={editingId ? 'Edit Budget Item' : 'Add Budget Item'} onClose={() => setOpenModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Year</label><input type="number" className="input" value={(form.year as number) ?? year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))} /></div>
            <div><label className="label">Month</label>
              <select className="input" value={(form.month as number) ?? 1} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Type</label>
              <select className="input" value={(form.expense_type as string) ?? 'OPEX'} onChange={e => setForm(f => ({ ...f, expense_type: e.target.value }))}>
                <option>OPEX</option><option>CAPEX</option>
              </select>
            </div>
            <div><label className="label">Category</label><input className="input" value={(form.category as string) ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div><label className="label">Subcategory</label><input className="input" value={(form.subcategory as string) ?? ''} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} /></div>
            <div><label className="label">Amount (THB)</label><input type="number" className="input" value={(form.amount_thb as number) ?? 0} onChange={e => setForm(f => ({ ...f, amount_thb: +e.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="label">Item Name</label><input className="input" value={(form.item_name as string) ?? ''} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpenModal(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={saveExpense} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {openModal === 'rent' && (
        <Modal title={editingId ? 'Edit Rent Year' : 'Add Rent Year'} onClose={() => setOpenModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Year #</label><input type="number" className="input" value={(form.year_number as number) ?? 1} onChange={e => setForm(f => ({ ...f, year_number: +e.target.value }))} /></div>
            <div><label className="label">Label (e.g. Rent 2026)</label><input className="input" value={(form.year_label as string) ?? ''} onChange={e => setForm(f => ({ ...f, year_label: e.target.value }))} /></div>
            <div><label className="label">Annual Rent (THB)</label><input type="number" className="input" value={(form.rent_thb as number) ?? 0} onChange={e => setForm(f => ({ ...f, rent_thb: +e.target.value }))} /></div>
            {(form.rent_thb as number) > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                <p>Monthly: <strong>{format((form.rent_thb as number) / 12)}</strong></p>
                <p>VAT (2.66%): <strong>{format((form.rent_thb as number) * 0.0266)}</strong></p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpenModal(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={saveRent} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #64748b; margin-bottom: 4px; }
        .input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      `}</style>
    </>
  )
}
