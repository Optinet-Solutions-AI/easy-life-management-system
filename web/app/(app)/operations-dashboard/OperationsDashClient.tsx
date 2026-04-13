'use client'

import { useState, useMemo } from 'react'
import { ExternalLink, Flame } from 'lucide-react'
import { useCurrency } from '@/context/CurrencyContext'
import { useRooms } from '@/context/RoomsContext'
import { DEPARTMENTS } from '@/types'
import StatCard from '@/components/StatCard'
const TM30_URL = 'https://extranet.immigration.go.th/fn24online/fn24/main/home.xhtml'

type Tab = 'today' | 'bookings' | 'revenue' | 'tasks' | 'operations' | 'cash'

interface GuestRow { id: string; room: number; guest_name: string; check_in: string; check_out: string; amount_thb_stay: number | null; payment: number | null; tm30: boolean }
interface TodoRow { id: string; topic: string; department: string | null; status: string; target_date: string | null; responsible_person: string | null; status_notes: string | null }
interface RevenueRow { amount_thb: number | null; date: string; type: string | null }
interface AccountRow { id: string; account_type: string; amount: number; notes: string | null; updated_at: string }
interface ExpenseRow { amount: number | null; payment_date: string | null; category: string | null; supplier: string | null; document_number?: string | null }

interface FireAlertRow {
  id: string
  location: string
  expiry_date: string
  serial_number: string | null
  rooms: { number: number; name: string } | null
}

interface Props {
  guests: GuestRow[]
  todos: TodoRow[]
  revenues: RevenueRow[]
  accountBalances: AccountRow[]
  noInvoiceTotal: number
  expenses: ExpenseRow[]
  fireAlerts: FireAlertRow[]
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: "Today's Ops" },
  { id: 'bookings', label: 'Bookings' },
  { id: 'revenue', label: 'Revenue & Collection' },
  { id: 'tasks', label: 'Tasks & Issues' },
  { id: 'operations', label: 'Operations Status' },
  { id: 'cash', label: 'Cash Control' },
]

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Complete: 'bg-green-500', Ongoing: 'bg-blue-500', Pending: 'bg-yellow-400', Blocked: 'bg-red-500'
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? 'bg-slate-300'}`} />
}

const ACCOUNT_STYLE: Record<string, { emoji: string; bg: string }> = {
  'Bank':    { emoji: '🏦', bg: 'bg-blue-50 border-blue-200' },
  'Cash':    { emoji: '💵', bg: 'bg-green-50 border-green-200' },
  'Wise':    { emoji: '💳', bg: 'bg-violet-50 border-violet-200' },
  'Revolut': { emoji: '💳', bg: 'bg-indigo-50 border-indigo-200' },
  'GM Bank': { emoji: '🏧', bg: 'bg-teal-50 border-teal-200' },
}

export default function OperationsDashClient({ guests, todos, revenues, accountBalances, noInvoiceTotal, expenses, fireAlerts }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const { format } = useCurrency()
  const TOTAL_ROOMS = useRooms().filter(r => r.active).length || 10

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // ── Today's Operations ──
  const todayOps = useMemo(() => {
    const inHouse = guests.filter(g => new Date(g.check_in) <= today && new Date(g.check_out) >= today)
    const checkIns = guests.filter(g => g.check_in.slice(0, 10) === todayStr)
    const checkOuts = guests.filter(g => g.check_out.slice(0, 10) === todayStr)
    const noTM30 = inHouse.filter(g => !g.tm30)
    return { inHouse, checkIns, checkOuts, available: TOTAL_ROOMS - inHouse.length, noTM30 }
  }, [guests, todayStr])

  // ── Bookings ──
  const upcoming = useMemo(() =>
    guests.filter(g => {
      const diff = (new Date(g.check_in).getTime() - today.getTime()) / 86400000
      return diff > 0 && diff <= 14
    }).sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())
  , [guests])

  const departing = useMemo(() =>
    guests.filter(g => {
      const diff = (new Date(g.check_out).getTime() - today.getTime()) / 86400000
      return diff >= 0 && diff <= 7
    }).sort((a, b) => new Date(a.check_out).getTime() - new Date(b.check_out).getTime())
  , [guests])

  // ── Revenue & Collection ──
  const monthRev = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return revenues.filter(r => new Date(r.date) >= start).reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  }, [revenues])

  const outstanding = useMemo(() =>
    guests.filter(g => ((g.amount_thb_stay ?? 0) - (g.payment ?? 0)) > 0)
      .map(g => ({ ...g, balance: (g.amount_thb_stay ?? 0) - (g.payment ?? 0) }))
      .sort((a, b) => b.balance - a.balance)
  , [guests])

  const totalOutstanding = outstanding.reduce((s, g) => s + g.balance, 0)

  // ── Tasks ──
  const overdue = useMemo(() => todos.filter(t => t.target_date && new Date(t.target_date) < today && t.status !== 'Complete'), [todos])
  const dueToday = useMemo(() => todos.filter(t => t.target_date?.slice(0, 10) === todayStr && t.status !== 'Complete'), [todos, todayStr])
  const tasksByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    todos.forEach(t => { m[t.status] = (m[t.status] ?? 0) + 1 })
    return m
  }, [todos])

  // ── Operations Status ──
  const byDept = useMemo(() => {
    const m: Record<string, TodoRow[]> = {}
    todos.forEach(t => {
      const dept = t.department ?? 'Other'
      if (!m[dept]) m[dept] = []
      m[dept].push(t)
    })
    return m
  }, [todos])

  // ── Cash Control ──
  const cashOnHand = accountBalances.reduce((s, a) => s + a.amount, 0)
  const recentExpenses = expenses.slice(0, 10)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dream-T Management System</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">GM Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <a href={TM30_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
          <ExternalLink size={13} /> TM30 Registration
        </a>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {t.id === 'tasks' && overdue.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{overdue.length}</span>
            )}
            {t.id === 'today' && fireAlerts.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">🔥</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Today's Operations ── */}
      {tab === 'today' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Check-ins Today" value={`${todayOps.checkIns.length}`} color="green" />
            <StatCard label="Check-outs Today" value={`${todayOps.checkOuts.length}`} color="yellow" />
            <StatCard label="In-House" value={`${todayOps.inHouse.length}`} color="blue" sub={`${TOTAL_ROOMS} total rooms`} />
            <StatCard label="Available" value={`${todayOps.available}`} color={todayOps.available > 0 ? 'default' : 'red'} sub={`${((todayOps.inHouse.length / TOTAL_ROOMS) * 100).toFixed(1)}% today`} />
          </div>

          {todayOps.checkIns.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <h3 className="text-sm font-semibold text-green-700">Arriving Today</h3>
              </div>
              {todayOps.checkIns.map(g => (
                <div key={g.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.guest_name}</p>
                    <p className="text-xs text-slate-400">Room {g.room} · until {new Date(g.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{format(g.amount_thb_stay)}</p>
                    {!g.tm30 && <span className="text-xs text-orange-500 font-medium">TM30 pending</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {todayOps.checkOuts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
                <h3 className="text-sm font-semibold text-yellow-700">Departing Today</h3>
              </div>
              {todayOps.checkOuts.map(g => {
                const balance = (g.amount_thb_stay ?? 0) - (g.payment ?? 0)
                return (
                  <div key={g.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{g.guest_name}</p>
                      <p className="text-xs text-slate-400">Room {g.room}</p>
                    </div>
                    <p className={`text-sm font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {balance > 0 ? `${format(balance)} outstanding` : 'Paid'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {todayOps.noTM30.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-orange-700 mb-1">TM30 Pending ({todayOps.noTM30.length} guests)</p>
              <p className="text-xs text-orange-600">{todayOps.noTM30.map(g => `${g.guest_name} (Rm ${g.room})`).join(', ')}</p>
              <a href={TM30_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-orange-600 hover:text-orange-800">
                <ExternalLink size={12} /> Register on Thai Immigration portal
              </a>
            </div>
          )}

          {/* Fire extinguisher expiry alerts */}
          {fireAlerts.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <Flame size={15} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700">
                  Fire Extinguisher Alerts ({fireAlerts.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {fireAlerts.map(fe => {
                  const days = Math.ceil((new Date(fe.expiry_date).getTime() - Date.now()) / 86400000)
                  const isExpired = days < 0
                  return (
                    <div key={fe.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">
                          {fe.rooms ? `Room ${fe.rooms.number} — ${fe.rooms.name}` : 'Unknown room'}
                        </p>
                        <p className="text-xs text-slate-400">{fe.location}{fe.serial_number ? ` · S/N ${fe.serial_number}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs font-semibold text-slate-600">
                          {new Date(fe.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <span className={`text-xs font-semibold ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                          {isExpired ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {todayOps.checkIns.length === 0 && todayOps.checkOuts.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
              No check-ins or check-outs today.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Bookings & Occupancy ── */}
      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Arriving — Next 14 Days ({upcoming.length})</h3>
              </div>
              {upcoming.length === 0 ? <p className="p-4 text-sm text-slate-400">No arrivals in the next 14 days.</p> : (
                <div className="divide-y divide-slate-100">
                  {upcoming.map(g => (
                    <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{g.guest_name}</p>
                        <p className="text-xs text-slate-400">Room {g.room} · {new Date(g.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{format(g.amount_thb_stay)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Departing — Next 7 Days ({departing.length})</h3>
              </div>
              {departing.length === 0 ? <p className="p-4 text-sm text-slate-400">No departures in the next 7 days.</p> : (
                <div className="divide-y divide-slate-100">
                  {departing.map(g => {
                    const balance = (g.amount_thb_stay ?? 0) - (g.payment ?? 0)
                    return (
                      <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{g.guest_name}</p>
                          <p className="text-xs text-slate-400">Room {g.room} · {new Date(g.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        </div>
                        {balance > 0 && <span className="text-xs font-medium text-red-500">{format(balance)} due</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Revenue & Collection ── */}
      {tab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard label="Revenue This Month" value={format(monthRev)} color="green" />
            <StatCard label="Total Outstanding" value={format(totalOutstanding)} color={totalOutstanding > 0 ? 'red' : 'green'} sub={`${outstanding.length} guests`} />
          </div>
          {outstanding.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h3 className="text-sm font-semibold text-red-700">Outstanding Balances</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {outstanding.map(g => (
                  <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{g.guest_name}</p>
                      <p className="text-xs text-slate-400">Room {g.room} · Out: {new Date(g.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{format(g.balance)}</p>
                      <p className="text-xs text-slate-400">of {format(g.amount_thb_stay)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Tasks & Issues ── */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
              <p className="text-xs font-medium text-red-600 mt-0.5">Overdue</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-orange-600">{dueToday.length}</p>
              <p className="text-xs font-medium text-orange-600 mt-0.5">Due Today</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-yellow-600">{tasksByStatus['Pending'] ?? 0}</p>
              <p className="text-xs font-medium text-yellow-600 mt-0.5">Pending</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{tasksByStatus['Complete'] ?? 0}</p>
              <p className="text-xs font-medium text-green-600 mt-0.5">Complete</p>
            </div>
          </div>
          {overdue.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h3 className="text-sm font-semibold text-red-700">Overdue Tasks</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {overdue.map(t => (
                  <div key={t.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.topic}</p>
                      <p className="text-xs text-slate-400">{t.department} {t.responsible_person && `· ${t.responsible_person}`}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-red-500 font-medium">{t.target_date ? new Date(t.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}</span>
                      <p className="text-xs text-slate-400">{t.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {dueToday.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
              <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                <h3 className="text-sm font-semibold text-orange-700">Due Today</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {dueToday.map(t => (
                  <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{t.topic}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusDot status={t.status} />
                      <span className="text-xs text-slate-500">{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Operations Status ── */}
      {tab === 'operations' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Task status grouped by department</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DEPARTMENTS.map(dept => {
              const deptTasks = byDept[dept] ?? []
              if (deptTasks.length === 0) return null
              const open = deptTasks.filter(t => t.status !== 'Complete').length
              const blocked = deptTasks.filter(t => t.status === 'Blocked').length
              return (
                <div key={dept} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">{dept}</h3>
                    <div className="flex gap-1.5">
                      {blocked > 0 && <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">{blocked} blocked</span>}
                      {open > 0 && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{open} open</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {deptTasks.slice(0, 4).map(t => (
                      <div key={t.id} className="flex items-center gap-2">
                        <StatusDot status={t.status} />
                        <span className="text-xs text-slate-600 truncate">{t.topic}</span>
                      </div>
                    ))}
                    {deptTasks.length > 4 && <p className="text-xs text-slate-400 pl-4">+{deptTasks.length - 4} more</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Cash Control ── */}
      {tab === 'cash' && (
        <div className="space-y-4">

          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Cash on Hand" value={format(cashOnHand)} color="blue" />
            <StatCard label="No Invoice/Receipt" value={format(noInvoiceTotal)}
              color="yellow" sub="Expenses without documents" />
            {outstanding.length > 0 && (
              <StatCard label="Guest Receivables" value={format(totalOutstanding)}
                color="red" sub={`${outstanding.length} guest(s) pending`} />
            )}
          </div>

          {/* 6 account cards */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Account Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accountBalances.map(a => {
                const style = ACCOUNT_STYLE[a.account_type]
                return (
                  <div key={a.id} className={`rounded-xl border p-4 ${style?.bg ?? 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{style?.emoji ?? '💰'}</span>
                      <p className="text-sm font-semibold text-slate-700">{a.account_type}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{format(a.amount)}</p>
                    {a.notes && <p className="text-xs text-slate-400 mt-1">{a.notes}</p>}
                    {a.updated_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        Updated {new Date(a.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* No Invoice/Receipt — calculated */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🧾</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">No Invoice/Receipt</p>
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Auto-calculated</span>
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-700">{format(noInvoiceTotal)}</p>
                <p className="text-xs text-slate-500 mt-1">Total expenses without supporting documents</p>
              </div>
            </div>
          </div>

          {/* Recent expenses */}
          {recentExpenses.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Recent Expenses</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {recentExpenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm">{e.supplier ?? e.category ?? '—'}</p>
                      <p className="text-xs text-slate-400">
                        {e.payment_date
                          ? new Date(e.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                          : 'No date'}
                        {(!e.document_number || String(e.document_number).trim() === '') &&
                          <span className="ml-2 text-amber-600 font-medium">No invoice</span>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-500">{format(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
