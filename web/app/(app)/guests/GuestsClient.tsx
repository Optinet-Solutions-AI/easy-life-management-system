'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck, ShieldAlert, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, PAYMENT_METHODS, ROOMS } from '@/types'
import type { Guest } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { useCurrency } from '@/context/CurrencyContext'

const EMPTY: Partial<Guest> = {
  room: 1, check_in: '', check_out: '', guest_name: '', guest_count: 1,
  amount_thb_day: null, amount_thb_stay: null, paid: '', payment: 0,
  invoice: '', notes: '', email: '', phone: '',
  passport_number: '', passport_expiry: '', tm30: false,
}

const PAGE_SIZE = 10

type SortKey = 'check_in' | 'check_out' | 'room' | 'guest_name' | 'amount_thb_stay' | 'payment'
type SortDir = 'asc' | 'desc'

export default function GuestsClient({ initialGuests }: { initialGuests: Guest[] }) {
  const { format } = useCurrency()

  // Deduplicate on client side by id
  const allGuests = useMemo(() => {
    const seen = new Set<string>()
    return initialGuests.filter(g => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })
  }, [initialGuests])

  const [guests, setGuests] = useState<Guest[]>(allGuests)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Guest | null>(null)
  const [form, setForm] = useState<Partial<Guest>>(EMPTY)
  const [saving, setSaving] = useState(false)

  // Search + sort + pagination state
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('check_in')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (g: Guest) => { setEditing(g); setForm(g); setOpen(true) }

  const nights = form.check_in && form.check_out
    ? Math.max(0, Math.round((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000))
    : 0

  const computedStay = form.amount_thb_day && nights ? form.amount_thb_day * nights : form.amount_thb_stay ?? 0
  const balance = (form.amount_thb_stay ?? computedStay) - (form.payment ?? 0)

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      amount_thb_stay: form.amount_thb_stay ?? (form.amount_thb_day && nights ? form.amount_thb_day * nights : null),
    }
    if (editing) {
      const { data } = await supabase.from('guests').update(payload).eq('id', editing.id).select().single()
      if (data) setGuests(prev => prev.map(g => g.id === editing.id ? data : g))
    } else {
      const { data } = await supabase.from('guests').insert(payload).select().single()
      if (data) setGuests(prev => [data, ...prev])
    }
    setSaving(false)
    setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this guest record?')) return
    await supabase.from('guests').delete().eq('id', id)
    setGuests(prev => prev.filter(g => g.id !== id))
  }

  const today = new Date()
  const statusOf = (g: Guest) => {
    const ci = new Date(g.check_in), co = new Date(g.check_out)
    if (co < today) return { label: 'Checked Out', cls: 'bg-slate-100 text-slate-500' }
    if (ci <= today) return { label: 'In-House', cls: 'bg-green-100 text-green-700' }
    return { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700' }
  }

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return guests
    return guests.filter(g =>
      g.guest_name.toLowerCase().includes(q) ||
      String(g.room).includes(q) ||
      (g.email ?? '').toLowerCase().includes(q) ||
      (g.passport_number ?? '').toLowerCase().includes(q)
    )
  }, [guests, search])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      if (sortKey === 'check_in' || sortKey === 'check_out') {
        av = new Date(a[sortKey]).getTime()
        bv = new Date(b[sortKey]).getTime()
      } else if (sortKey === 'room') {
        av = a.room; bv = b.room
      } else if (sortKey === 'guest_name') {
        av = a.guest_name.toLowerCase(); bv = b.guest_name.toLowerCase()
      } else if (sortKey === 'amount_thb_stay') {
        av = a.amount_thb_stay ?? 0; bv = b.amount_thb_stay ?? 0
      } else if (sortKey === 'payment') {
        av = a.payment ?? 0; bv = b.payment ?? 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-300 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={12} className="text-blue-500 ml-1 inline" />
  }

  return (
    <>
      <PageHeader
        title="Guests"
        subtitle={`${filtered.length} of ${guests.length} bookings`}
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Guest
          </button>
        }
      />

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, room, email, passport…"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {paginated.map(g => {
          const ns = Math.max(0, Math.round((new Date(g.check_out).getTime() - new Date(g.check_in).getTime()) / 86400000))
          const stay = g.amount_thb_stay ?? (g.amount_thb_day ? g.amount_thb_day * ns : 0)
          const bal = stay - (g.payment ?? 0)
          const { label, cls } = statusOf(g)
          return (
            <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{g.guest_name}</p>
                  <p className="text-xs text-slate-500">Room #{g.room} · {ns} nights</p>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/invoice/${g.id}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-green-700 p-1"><FileText size={15} /></a>
                  <button onClick={() => openEdit(g)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                  <button onClick={() => remove(g.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-2">{formatDate(g.check_in)} → {formatDate(g.check_out)}</div>
              {g.passport_number && <p className="text-xs text-slate-400 font-mono mb-2">🛂 {g.passport_number}{g.passport_expiry ? ` · exp. ${formatDate(g.passport_expiry)}` : ''}</p>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                  {g.tm30
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><ShieldCheck size={11} /> TM30</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><ShieldAlert size={11} /> TM30</span>
                  }
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total {format(stay)}</p>
                  <p className={`text-sm font-bold ${bal > 0 ? 'text-red-600' : 'text-slate-400'}`}>{bal > 0 ? `Owes ${format(bal)}` : 'Paid'}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('room')}>
                  Room <SortIcon col="room" />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('guest_name')}>
                  Guest <SortIcon col="guest_name" />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('check_in')}>
                  Check-In <SortIcon col="check_in" />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('check_out')}>
                  Check-Out <SortIcon col="check_out" />
                </th>
                <th className="text-right px-4 py-3 font-medium">Nights</th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('amount_thb_stay')}>
                  Stay Total <SortIcon col="amount_thb_stay" />
                </th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('payment')}>
                  Paid <SortIcon col="payment" />
                </th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">TM30</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-slate-400">No guests found.</td></tr>
              ) : paginated.map(g => {
                const ns = Math.max(0, Math.round((new Date(g.check_out).getTime() - new Date(g.check_in).getTime()) / 86400000))
                const stay = g.amount_thb_stay ?? (g.amount_thb_day ? g.amount_thb_day * ns : 0)
                const bal = stay - (g.payment ?? 0)
                const { label, cls } = statusOf(g)
                return (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">#{g.room}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{g.guest_name}</p>
                      {g.email && <p className="text-xs text-slate-400">{g.email}</p>}
                      {g.passport_number && <p className="text-xs text-slate-400 font-mono">🛂 {g.passport_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(g.check_in)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(g.check_out)}</td>
                    <td className="px-4 py-3 text-right">{ns}</td>
                    <td className="px-4 py-3 text-right font-medium">{format(stay)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{format(g.payment)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${bal > 0 ? 'text-red-600' : 'text-slate-400'}`}>{format(bal)}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span></td>
                    <td className="px-4 py-3 text-center">
                      {g.tm30
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><ShieldCheck size={11} /> Filed</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><ShieldAlert size={11} /> Pending</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <a href={`/api/invoice/${g.id}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-green-700"><FileText size={15} /></a>
                        <button onClick={() => openEdit(g)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                        <button onClick={() => remove(g.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === safePage ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <Modal title={editing ? 'Edit Guest' : 'Add Guest'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Room</label>
              <select className="input" value={form.room} onChange={e => setForm(f => ({ ...f, room: +e.target.value }))}>
                {ROOMS.map(r => <option key={r} value={r}>Room {r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Guest Name</label>
              <input className="input" value={form.guest_name ?? ''} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Check-In</label>
              <input type="date" className="input" value={form.check_in ?? ''} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} />
            </div>
            <div>
              <label className="label">Check-Out</label>
              <input type="date" className="input" value={form.check_out ?? ''} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount/Day (THB)</label>
              <input type="number" className="input" value={form.amount_thb_day ?? ''} onChange={e => setForm(f => ({ ...f, amount_thb_day: +e.target.value || null }))} />
            </div>
            <div>
              <label className="label">Total Stay (THB) {nights > 0 && <span className="text-slate-400 font-normal">({nights} nights)</span>}</label>
              <input type="number" className="input" value={form.amount_thb_stay ?? ''} onChange={e => setForm(f => ({ ...f, amount_thb_stay: +e.target.value || null }))} />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.paid ?? ''} onChange={e => setForm(f => ({ ...f, paid: e.target.value }))}>
                <option value="">—</option>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (THB)</label>
              <input type="number" className="input" value={form.payment ?? ''} onChange={e => setForm(f => ({ ...f, payment: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Legal & Compliance */}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Legal &amp; Compliance</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Passport Number</label>
                  <input className="input font-mono" value={form.passport_number ?? ''} onChange={e => setForm(f => ({ ...f, passport_number: e.target.value }))} placeholder="e.g. AB123456" />
                </div>
                <div>
                  <label className="label">Passport Expiry</label>
                  <input type="date" className="input" value={form.passport_expiry ?? ''} onChange={e => setForm(f => ({ ...f, passport_expiry: e.target.value }))} />
                </div>
              </div>
              <div className={`mt-3 flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${form.tm30 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
                onClick={() => setForm(f => ({ ...f, tm30: !f.tm30 }))}>
                <input type="checkbox" id="tm30" checked={form.tm30 ?? false} readOnly className="w-4 h-4 accent-green-600" />
                <div>
                  <label htmlFor="tm30" className={`text-sm font-semibold cursor-pointer ${form.tm30 ? 'text-green-700' : 'text-amber-700'}`}>
                    TM30 Filed
                  </label>
                  <p className="text-xs text-slate-500">Immigration notification for foreign guest stay</p>
                </div>
                {form.tm30
                  ? <ShieldCheck size={18} className="ml-auto text-green-600 shrink-0" />
                  : <ShieldAlert size={18} className="ml-auto text-amber-500 shrink-0" />
                }
              </div>
            </div>

            {balance > 0 && (
              <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                Balance due: <strong>{format(balance)}</strong>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
            <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
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
