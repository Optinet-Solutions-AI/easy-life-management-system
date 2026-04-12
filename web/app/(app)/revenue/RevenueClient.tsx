'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import type { Revenue } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'
import { usePermissions } from '@/context/PermissionsContext'

const EMPTY: Partial<Revenue> = { date: '', type: '', supplier: '', amount_thb: null, notes: '' }
const PAGE_SIZE = 10
type SortKey = 'date' | 'type' | 'supplier' | 'amount_thb'
type SortDir = 'asc' | 'desc'

interface GuestPayment { check_in: string; check_out: string; amount_thb_stay: number | null; payment: number | null; guest_name: string }

export default function RevenueClient({ initialRevenue, guestPayments }: { initialRevenue: Revenue[]; guestPayments: GuestPayment[] }) {
  const { format } = useCurrency()
  const { can } = usePermissions()
  const canAdd    = can('revenue', 'add')
  const canEdit   = can('revenue', 'edit')
  const canDelete = can('revenue', 'delete')
  const [revenues, setRevenues] = useState<Revenue[]>(initialRevenue)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Revenue | null>(null)
  const [form, setForm] = useState<Partial<Revenue>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return revenues
    return revenues.filter(r =>
      (r.type ?? '').toLowerCase().includes(q) ||
      (r.supplier ?? '').toLowerCase().includes(q) ||
      (r.notes ?? '').toLowerCase().includes(q)
    )
  }, [revenues, search])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0
    if (sortKey === 'date') { av = a.date ?? ''; bv = b.date ?? '' }
    else if (sortKey === 'type') { av = (a.type ?? '').toLowerCase(); bv = (b.type ?? '').toLowerCase() }
    else if (sortKey === 'supplier') { av = (a.supplier ?? '').toLowerCase(); bv = (b.supplier ?? '').toLowerCase() }
    else if (sortKey === 'amount_thb') { av = a.amount_thb ?? 0; bv = b.amount_thb ?? 0 }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setCurrentPage(1)
  }
  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-300 ml-1 inline" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-500 ml-1 inline" /> : <ChevronDown size={12} className="text-blue-500 ml-1 inline" />
  }

  const totalRevenue = revenues.reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  const filteredTotal = filtered.reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  const totalGuestPayments = guestPayments.reduce((s, g) => s + (g.payment ?? 0), 0)
  const outstanding = guestPayments.reduce((s, g) => s + ((g.amount_thb_stay ?? 0) - (g.payment ?? 0)), 0)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (r: Revenue) => { setEditing(r); setForm(r); setOpen(true) }

  async function save() {
    setSaving(true)
    // Only send editable fields — never send id / created_at
    const payload = {
      date:       form.date       || null,
      type:       form.type       || null,
      supplier:   form.supplier   || null,
      amount_thb: form.amount_thb ?? null,
      notes:      form.notes      || null,
    }
    try {
      if (editing) {
        const { data, error } = await supabase.from('revenue').update(payload).eq('id', editing.id).select().single()
        if (error) throw error
        setRevenues(prev => prev.map(r => r.id === editing.id ? (data ?? { ...editing, ...payload }) : r))
      } else {
        const { data, error } = await supabase.from('revenue').insert(payload).select().single()
        if (error) throw error
        if (data) setRevenues(prev => [data, ...prev])
      }
      setOpen(false)
    } catch (err: unknown) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this revenue record?')) return
    const { error } = await supabase.from('revenue').delete().eq('id', id)
    if (error) { alert('Delete failed: ' + error.message); return }
    setRevenues(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Revenue"
        subtitle={`${filtered.length} of ${revenues.length} records`}
        action={canAdd ? (
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Revenue
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue Logged" value={format(totalRevenue)} color="green" />
        <StatCard label="Total Guest Payments" value={format(totalGuestPayments)} color="green" sub="Sum of paid amounts in Guests" />
        <StatCard label="Outstanding from Guests" value={format(outstanding)} color={outstanding > 0 ? 'red' : 'default'} />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Search type, supplier, notes…"
          value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('date')}>Date <SortIcon col="date" /></th>
              <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('type')}>Type <SortIcon col="type" /></th>
              <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('supplier')}>Supplier / Source <SortIcon col="supplier" /></th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('amount_thb')}>Amount (THB) <SortIcon col="amount_thb" /></th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">No records found.</td></tr>
              : paginated.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">{formatDate(r.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{r.type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.supplier}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{format(r.amount_thb)}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{r.notes}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2 justify-end">
                      {canEdit   && <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>}
                      {canDelete && <button onClick={() => remove(r.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            <tr>
              <td colSpan={3} className="px-4 py-2.5 font-semibold text-slate-600">{search ? 'Filtered Total' : 'Total'}</td>
              <td className="px-4 py-2.5 text-right font-bold text-green-600">{format(search ? filteredTotal : totalRevenue)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === safePage ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {open && (
        <Modal title={editing ? 'Edit Revenue' : 'Add Revenue'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date</label><input type="date" className="input" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="label">Type (e.g. March Rooms)</label><input className="input" value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></div>
            <div><label className="label">Supplier / Source</label><input className="input" value={form.supplier ?? ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            <div><label className="label">Amount (THB)</label><input type="number" className="input" value={form.amount_thb ?? ''} onChange={e => setForm(f => ({ ...f, amount_thb: +e.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
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
