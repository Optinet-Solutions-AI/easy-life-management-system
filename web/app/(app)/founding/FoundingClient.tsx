'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, SHAREHOLDERS, PAYMENT_METHODS } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import type { FoundingContribution } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'

const EMPTY: Partial<FoundingContribution> = { date: '', method: '', shareholder: '', amount_thb: null, amount_eur: null, notes: '' }
const PAGE_SIZE = 10
type SortKey = 'date' | 'shareholder' | 'amount_thb'
type SortDir = 'asc' | 'desc'

export default function FoundingClient({ initialContributions }: { initialContributions: FoundingContribution[] }) {
  const { format } = useCurrency()
  const [contributions, setContributions] = useState<FoundingContribution[]>(initialContributions)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FoundingContribution | null>(null)
  const [form, setForm] = useState<Partial<FoundingContribution>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contributions
    return contributions.filter(c =>
      c.shareholder.toLowerCase().includes(q) ||
      (c.method ?? '').toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q)
    )
  }, [contributions, search])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0
    if (sortKey === 'date') { av = a.date ?? ''; bv = b.date ?? '' }
    else if (sortKey === 'shareholder') { av = a.shareholder.toLowerCase(); bv = b.shareholder.toLowerCase() }
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

  const perShareholder = useMemo(() => {
    return SHAREHOLDERS.map(name => {
      const total = contributions.filter(c => c.shareholder === name).reduce((s, c) => s + (c.amount_thb ?? 0), 0)
      return { name, total }
    })
  }, [contributions])

  const grandTotal = contributions.reduce((s, c) => s + (c.amount_thb ?? 0), 0)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (c: FoundingContribution) => { setEditing(c); setForm(c); setOpen(true) }

  async function save() {
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('founding_contributions').update(form).eq('id', editing.id).select().single()
      if (data) setContributions(prev => prev.map(c => c.id === editing.id ? data : c))
    } else {
      const { data } = await supabase.from('founding_contributions').insert(form).select().single()
      if (data) setContributions(prev => [...prev, data])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this contribution?')) return
    await supabase.from('founding_contributions').delete().eq('id', id)
    setContributions(prev => prev.filter(c => c.id !== id))
  }

  const colors = ['blue', 'green', 'yellow', 'default'] as const

  return (
    <>
      <PageHeader
        title="Founding Shareholders"
        subtitle={`${filtered.length} of ${contributions.length} contributions`}
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Contribution
          </button>
        }
      />

      {/* Per shareholder summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {perShareholder.map(({ name, total }, i) => (
          <StatCard key={name} label={name.split(' ')[0]} value={format(total)} color={colors[i % colors.length]}
            sub={grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(1)}%` : undefined} />
        ))}
      </div>
      <div className="mb-6">
        <StatCard label="Total Capital Founded" value={format(grandTotal)} color="blue" />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Search shareholder, method, notes…"
          value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('date')}>Date <SortIcon col="date" /></th>
              <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('shareholder')}>Shareholder <SortIcon col="shareholder" /></th>
              <th className="text-left px-4 py-3 font-medium">Method</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('amount_thb')}>Amount (THB) <SortIcon col="amount_thb" /></th>
              <th className="text-right px-4 py-3 font-medium">Amount (EUR)</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0
              ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No contributions found.</td></tr>
              : paginated.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">{formatDate(c.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{c.shareholder}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.method}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{format(c.amount_thb)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{c.amount_eur != null ? `€${c.amount_eur.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">{c.notes}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                      <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
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
        <Modal title={editing ? 'Edit Contribution' : 'Add Contribution'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date</label><input type="date" className="input" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="label">Shareholder</label>
              <select className="input" value={form.shareholder ?? ''} onChange={e => setForm(f => ({ ...f, shareholder: e.target.value }))}>
                <option value="">—</option>{SHAREHOLDERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Method</label>
              <select className="input" value={form.method ?? ''} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option value="">—</option>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Amount (THB)</label><input type="number" className="input" value={form.amount_thb ?? ''} onChange={e => setForm(f => ({ ...f, amount_thb: +e.target.value }))} /></div>
            <div><label className="label">Amount (EUR)</label><input type="number" className="input" value={form.amount_eur ?? ''} onChange={e => setForm(f => ({ ...f, amount_eur: +e.target.value }))} /></div>
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
