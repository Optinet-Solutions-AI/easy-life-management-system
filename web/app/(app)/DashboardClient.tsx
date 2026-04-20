'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Pencil, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/context/CurrencyContext'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: THIS_YEAR - 2022 }, (_, i) => 2023 + i)

// Display config for each account type
const ACCOUNT_CONFIG: Record<string, { emoji: string; colorClass: string; editBg: string }> = {
  'Bank':    { emoji: '🏦', colorClass: 'border-blue-200 bg-blue-50',    editBg: 'bg-blue-600' },
  'Cash':    { emoji: '💵', colorClass: 'border-green-200 bg-green-50',  editBg: 'bg-green-600' },
  'Wise':    { emoji: '💳', colorClass: 'border-violet-200 bg-violet-50',editBg: 'bg-violet-600' },
  'Revolut': { emoji: '💳', colorClass: 'border-indigo-200 bg-indigo-50',editBg: 'bg-indigo-600' },
  'GM Bank': { emoji: '🏧', colorClass: 'border-teal-200 bg-teal-50',    editBg: 'bg-teal-600' },
}

interface AccountBalance { id: string; account_type: string; amount: number; notes: string | null; updated_at: string }
interface GuestRow { id: string; room: string; guest_name: string; check_in: string; check_out: string; amount_thb_stay: number | null; payment: number | null }
interface Props {
  currentGuests: GuestRow[]
  upcomingGuests: GuestRow[]
  todosByStatus: Record<string, number>
}
interface Financials { totalExpenses: number; totalRevenue: number; totalFounded: number }

export default function DashboardClient({ currentGuests, upcomingGuests, todosByStatus }: Props) {
  const { format } = useCurrency()

  // ── Year filter ───────────────────────────────────────────────────────────
  const [selectedYears, setSelectedYears] = useState<number[]>([THIS_YEAR])
  const [financials, setFinancials] = useState<Financials | null>(null)
  const [loadingFin, setLoadingFin] = useState(true)

  const toggleYear = (y: number) =>
    setSelectedYears(prev =>
      prev.includes(y)
        ? prev.length === 1 ? prev : prev.filter(x => x !== y)
        : [...prev, y].sort((a, b) => a - b)
    )

  const fetchFinancials = useCallback(async () => {
    setLoadingFin(true)
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    const [expRes, revRes, foundRes] = await Promise.all([
      supabase.from('expenses').select('amount, payment_date').gte('payment_date', `${minYear}-01-01`).lte('payment_date', `${maxYear}-12-31`),
      supabase.from('revenue').select('amount_thb, date').gte('date', `${minYear}-01-01`).lte('date', `${maxYear}-12-31`),
      supabase.from('founding_contributions').select('amount_thb, date').gte('date', `${minYear}-01-01`).lte('date', `${maxYear}-12-31`),
    ])
    const inRange = (d: string | null) => !!d && selectedYears.includes(new Date(d).getFullYear())
    setFinancials({
      totalExpenses: (expRes.data ?? []).filter(r => inRange(r.payment_date)).reduce((s, r) => s + Math.abs(r.amount ?? 0), 0),
      totalRevenue:  (revRes.data ?? []).filter(r => inRange(r.date)).reduce((s, r) => s + (r.amount_thb ?? 0), 0),
      totalFounded:  (foundRes.data ?? []).filter(r => inRange(r.date)).reduce((s, r) => s + (r.amount_thb ?? 0), 0),
    })
    setLoadingFin(false)
  }, [selectedYears])

  useEffect(() => { fetchFinancials() }, [fetchFinancials])

  // ── Account Balances ──────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountBalance[]>([])
  const [noInvoiceTotal, setNoInvoiceTotal] = useState(0)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [editingAccount, setEditingAccount] = useState<AccountBalance | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    async function fetchAccounts() {
      const [accRes, expRes] = await Promise.all([
        supabase.from('account_balances').select('*').order('account_type'),
        supabase.from('expenses').select('amount, file_url'),
      ])
      setAccounts(accRes.data ?? [])
      const noInv = (expRes.data ?? [])
        .filter(e => !e.file_url || String(e.file_url).trim() === '')
        .reduce((s, e) => s + Math.abs(e.amount ?? 0), 0)
      setNoInvoiceTotal(noInv)
      setLoadingAccounts(false)
    }
    fetchAccounts()
  }, [])

  function openEdit(acc: AccountBalance) {
    setEditingAccount(acc)
    setEditAmount(String(acc.amount))
    setEditNotes(acc.notes ?? '')
  }

  async function saveAccount() {
    if (!editingAccount) return
    setEditSaving(true)
    const newAmount = parseFloat(editAmount) || 0
    await supabase.from('account_balances')
      .update({ amount: newAmount, notes: editNotes, updated_at: new Date().toISOString() })
      .eq('id', editingAccount.id)
    setAccounts(prev => prev.map(a => a.id === editingAccount.id
      ? { ...a, amount: newAmount, notes: editNotes }
      : a
    ))
    setEditingAccount(null)
    setEditSaving(false)
  }

  const cashTotal = accounts.reduce((s, a) => s + a.amount, 0)
  const netPosition = financials
    ? financials.totalRevenue + financials.totalFounded - financials.totalExpenses
    : 0
  const yearLabel = selectedYears.length === 1 ? String(selectedYears[0]) : selectedYears.join(' + ')

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
            <button key={y} onClick={() => toggleYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                selectedYears.includes(y)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
              }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Financial KPIs */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
          Financial Overview — {yearLabel}
          {loadingFin && <Loader2 size={12} className="animate-spin text-blue-400" />}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Expenses"  value={loadingFin ? '—' : format(financials!.totalExpenses)} color="red" />
          <StatCard label="Total Revenue"   value={loadingFin ? '—' : format(financials!.totalRevenue)}  color="green" />
          <StatCard label="Capital Funded"  value={loadingFin ? '—' : format(financials!.totalFounded)}  color="blue" />
          <StatCard label="Net Position"    value={loadingFin ? '—' : format(netPosition)}
            color={!loadingFin && netPosition >= 0 ? 'green' : 'red'} sub="Revenue + Funded − Expenses" />
        </div>
      </section>

      {/* Account Balances */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
            Account Balances
            {loadingAccounts && <Loader2 size={12} className="animate-spin text-blue-400" />}
          </h2>
          {!loadingAccounts && (
            <span className="text-xs text-slate-500">
              Total cash on hand: <span className="font-semibold text-slate-700">{format(cashTotal)}</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 5 editable accounts */}
          {accounts.map(acc => {
            const cfg = ACCOUNT_CONFIG[acc.account_type]
            return (
              <div key={acc.id}
                className={`relative rounded-xl border p-4 ${cfg?.colorClass ?? 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-lg leading-none">{cfg?.emoji ?? '💰'}</span>
                  <button onClick={() => openEdit(acc)}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors">
                    <Pencil size={13} />
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-500 mb-1">{acc.account_type}</p>
                <p className="text-base font-bold text-slate-900">{format(acc.amount)}</p>
                {acc.notes && <p className="text-xs text-slate-400 mt-1 truncate">{acc.notes}</p>}
              </div>
            )
          })}

          {/* No Invoice/Receipt — calculated */}
          <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-lg leading-none">🧾</span>
              <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Auto</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1">No Invoice/Receipt</p>
            <p className="text-base font-bold text-amber-700">{loadingAccounts ? '—' : format(noInvoiceTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">Expenses without docs</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Currently In-House */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Currently In-House ({currentGuests.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {currentGuests.length === 0
              ? <p className="p-4 text-sm text-slate-400">No guests currently in-house.</p>
              : (
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
            {upcomingGuests.length === 0
              ? <p className="p-4 text-sm text-slate-400">No arrivals in the next 7 days.</p>
              : (
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
        <section>
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

      {/* Edit Account Balance Modal */}
      {editingAccount && (
        <Modal title={`Update Balance — ${editingAccount.account_type}`} onClose={() => setEditingAccount(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Balance (THB)
              </label>
              <input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount in THB"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. as of 8 April 2026"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setEditingAccount(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={saveAccount} disabled={editSaving}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors ${ACCOUNT_CONFIG[editingAccount.account_type]?.editBg ?? 'bg-blue-600'}`}>
                {editSaving ? 'Saving…' : 'Save Balance'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
