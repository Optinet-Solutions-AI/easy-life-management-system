'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, ROOMS, COMPLAINT_CATEGORIES, COMPLAINT_SEVERITIES, COMPLAINT_STATUSES } from '@/types'
import type { Complaint } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

const PAGE_SIZE = 10

type SortKey = 'date' | 'guest_name' | 'room' | 'severity' | 'status'
type SortDir = 'asc' | 'desc'

const SEVERITY_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-slate-100 text-slate-600',
}
const STATUS_COLORS: Record<string, string> = {
  Open:        'bg-red-50 text-red-600',
  'In Progress':'bg-blue-50 text-blue-600',
  Resolved:    'bg-green-50 text-green-700',
  Closed:      'bg-slate-100 text-slate-500',
}

const EMPTY: Partial<Complaint> = {
  date: new Date().toISOString().split('T')[0],
  guest_name: '',
  room: null,
  category: null,
  description: '',
  severity: 'Medium',
  status: 'Open',
  resolution_notes: null,
  resolved_at: null,
  filed_by: '',
}

export default function ComplaintsClient({ initialComplaints }: { initialComplaints: Complaint[] }) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Complaint | null>(null)
  const [form, setForm] = useState<Partial<Complaint>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const openNew  = () => { setEditing(null);  setForm(EMPTY); setOpen(true) }
  const openEdit = (c: Complaint) => { setEditing(c); setForm(c); setOpen(true) }

  async function save() {
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('complaints').update(form).eq('id', editing.id).select().single()
      if (data) setComplaints(prev => prev.map(c => c.id === editing.id ? data : c))
    } else {
      const { data } = await supabase.from('complaints').insert(form).select().single()
      if (data) setComplaints(prev => [data, ...prev])
    }
    setSaving(false)
    setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this complaint record?')) return
    await supabase.from('complaints').delete().eq('id', id)
    setComplaints(prev => prev.filter(c => c.id !== id))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = filterStatus === 'all' ? complaints : complaints.filter(c => c.status === filterStatus)
    if (q) list = list.filter(c =>
      c.guest_name.toLowerCase().includes(q) ||
      String(c.room ?? '').includes(q) ||
      (c.category ?? '').toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.filed_by ?? '').toLowerCase().includes(q)
    )
    return list
  }, [complaints, search, filterStatus])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      if (sortKey === 'date') { av = a.date; bv = b.date }
      else if (sortKey === 'guest_name') { av = a.guest_name.toLowerCase(); bv = b.guest_name.toLowerCase() }
      else if (sortKey === 'room') { av = a.room ?? 0; bv = b.room ?? 0 }
      else if (sortKey === 'severity') { av = SEVERITY_ORDER[a.severity] ?? 0; bv = SEVERITY_ORDER[b.severity] ?? 0 }
      else if (sortKey === 'status') { av = a.status; bv = b.status }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setCurrentPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-300 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={12} className="text-blue-500 ml-1 inline" />
  }

  // Stats
  const openCount     = complaints.filter(c => c.status === 'Open').length
  const inProgCount   = complaints.filter(c => c.status === 'In Progress').length
  const criticalCount = complaints.filter(c => c.severity === 'Critical' && c.status !== 'Closed').length

  return (
    <>
      <PageHeader
        title="Complaints"
        subtitle={`${filtered.length} of ${complaints.length} records`}
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Log Complaint
          </button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Open</p>
          <p className="text-2xl font-bold text-red-600">{openCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{inProgCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-orange-600">{criticalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest, room, category…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-1">
          {['all', ...COMPLAINT_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('date')}>
                  Date <SortIcon col="date" />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('guest_name')}>
                  Guest <SortIcon col="guest_name" />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('room')}>
                  Room <SortIcon col="room" />
                </th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('severity')}>
                  Severity <SortIcon col="severity" />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No complaints found.</td></tr>
              ) : paginated.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(c.date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.guest_name}</p>
                    {c.filed_by && <p className="text-xs text-slate-400">Filed by {c.filed_by}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold">{c.room ? `#${c.room}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.category ?? '—'}</td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="truncate text-slate-700">{c.description}</p>
                    {c.resolution_notes && (
                      <p className="text-xs text-green-700 truncate mt-0.5">↳ {c.resolution_notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[c.severity] ?? 'bg-slate-100 text-slate-600'}`}>{c.severity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                      <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === safePage ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {open && (
        <Modal title={editing ? 'Edit Complaint' : 'Log Complaint'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Guest Name</label>
              <input className="input" value={form.guest_name ?? ''} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Room</label>
              <select className="input" value={form.room ?? ''} onChange={e => setForm(f => ({ ...f, room: e.target.value ? +e.target.value : null }))}>
                <option value="">— No room —</option>
                {ROOMS.map(r => <option key={r} value={r}>Room {r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value || null }))}>
                <option value="">— Select —</option>
                {COMPLAINT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity ?? 'Medium'} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {COMPLAINT_SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status ?? 'Open'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {COMPLAINT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Resolution Notes</label>
              <textarea className="input" rows={2} value={form.resolution_notes ?? ''} onChange={e => setForm(f => ({ ...f, resolution_notes: e.target.value || null }))} placeholder="How was this resolved?" />
            </div>
            <div>
              <label className="label">Resolved Date</label>
              <input type="date" className="input" value={form.resolved_at ?? ''} onChange={e => setForm(f => ({ ...f, resolved_at: e.target.value || null }))} />
            </div>
            <div>
              <label className="label">Filed By</label>
              <input className="input" value={form.filed_by ?? ''} onChange={e => setForm(f => ({ ...f, filed_by: e.target.value || null }))} placeholder="GM name" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
            <button onClick={save} disabled={saving || !form.guest_name || !form.description} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
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
