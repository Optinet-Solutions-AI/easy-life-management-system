'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTHB, STAFF_DEPARTMENTS, MONTHS } from '@/types'
import type { StaffHour } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { usePermissions } from '@/context/PermissionsContext'

const EMPTY: Partial<StaffHour> = {
  staff_name: '', role: '', department: '', date: '', hours: 0, hourly_rate_thb: undefined, notes: '',
}

const PAGE_SIZE = 50

export default function StaffHoursClient({ initialHours }: { initialHours: StaffHour[] }) {
  const { format } = useCurrency()
  const { can } = usePermissions()
  const canAdd    = can('staff_hours', 'add')
  const canEdit   = can('staff_hours', 'edit')
  const canDelete = can('staff_hours', 'delete')
  const [hours, setHours] = useState<StaffHour[]>(initialHours)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StaffHour | null>(null)
  const [form, setForm] = useState<Partial<StaffHour>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Derive staff name list
  const staffNames = useMemo(() => {
    const set = new Set(hours.map(h => h.staff_name))
    return Array.from(set).sort()
  }, [hours])

  // Derive month options
  const monthOptions = useMemo(() => {
    const set = new Set(hours.map(h => h.date.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [hours])

  // Filter
  const filtered = useMemo(() => hours.filter(h => {
    if (filterStaff !== 'all' && h.staff_name !== filterStaff) return false
    if (filterMonth !== 'all' && !h.date.startsWith(filterMonth)) return false
    return true
  }), [hours, filterStaff, filterMonth])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  // Monthly summary per staff member (filtered to current month selection)
  const monthlySummary = useMemo(() => {
    const source = filterMonth !== 'all' ? filtered : hours.filter(h => {
      const thisMonth = new Date().toISOString().slice(0, 7)
      return h.date.startsWith(thisMonth)
    })
    const map: Record<string, { hours: number; pay: number }> = {}
    for (const h of source) {
      if (!map[h.staff_name]) map[h.staff_name] = { hours: 0, pay: 0 }
      map[h.staff_name].hours += h.hours
      map[h.staff_name].pay += h.hours * (h.hourly_rate_thb ?? 0)
    }
    return Object.entries(map).sort((a, b) => b[1].hours - a[1].hours)
  }, [hours, filtered, filterMonth])

  const totalHours = filtered.reduce((s, h) => s + h.hours, 0)
  const totalPay = filtered.reduce((s, h) => s + h.hours * (h.hourly_rate_thb ?? 0), 0)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (h: StaffHour) => { setEditing(h); setForm(h); setOpen(true) }

  async function save() {
    if (!form.staff_name?.trim() || !form.date || !form.hours) return alert('Staff name, date, and hours are required.')
    setSaving(true)
    const payload = {
      staff_name: form.staff_name,
      role: form.role || null,
      department: form.department || null,
      date: form.date,
      hours: Number(form.hours),
      hourly_rate_thb: form.hourly_rate_thb ? Number(form.hourly_rate_thb) : null,
      notes: form.notes || null,
    }
    if (editing) {
      const { data } = await supabase.from('staff_hours').update(payload).eq('id', editing.id).select().single()
      if (data) setHours(prev => prev.map(h => h.id === editing.id ? data : h))
    } else {
      const { data } = await supabase.from('staff_hours').insert(payload).select().single()
      if (data) setHours(prev => [data, ...prev])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('staff_hours').delete().eq('id', id)
    setHours(prev => prev.filter(h => h.id !== id))
  }

  const summaryLabel = filterMonth !== 'all'
    ? `${MONTHS[parseInt(filterMonth.split('-')[1]) - 1]} ${filterMonth.split('-')[0]}`
    : 'This Month'

  return (
    <>
      <PageHeader
        title="Staff Hours"
        subtitle={`${hours.length} entries · payroll tracking`}
        action={canAdd ? (
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Log Hours
          </button>
        ) : undefined}
      />

      {/* Monthly summary cards */}
      {monthlySummary.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{summaryLabel} Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {monthlySummary.map(([name, stats]) => (
              <div key={name} className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-700 truncate">{name.split(' ')[0]}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{stats.hours.toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-1">hrs</span></p>
                {stats.pay > 0 && <p className="text-xs text-green-700 font-medium mt-0.5">{format(stats.pay)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none bg-white"
          value={filterStaff}
          onChange={e => { setFilterStaff(e.target.value); setPage(1) }}
        >
          <option value="all">All Staff</option>
          {staffNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none bg-white"
          value={filterMonth}
          onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
        >
          <option value="all">All Months</option>
          {monthOptions.map(m => <option key={m} value={m}>{MONTHS[parseInt(m.split('-')[1]) - 1]} {m.split('-')[0]}</option>)}
        </select>
        <div className="ml-auto flex gap-4 text-sm">
          <span className="text-slate-600"><span className="font-semibold text-slate-900">{totalHours.toFixed(1)}</span> hrs</span>
          {totalPay > 0 && <span className="text-green-700 font-semibold">{format(totalPay)}</span>}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Date', 'Staff', 'Department', 'Role', 'Hours', 'Rate', 'Total Pay', 'Notes', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(h => (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(h.date)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{h.staff_name}</td>
                <td className="px-4 py-3 text-slate-500">{h.department ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{h.role ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{h.hours}</td>
                <td className="px-4 py-3 text-slate-500">{h.hourly_rate_thb ? format(h.hourly_rate_thb) : '—'}</td>
                <td className="px-4 py-3 font-medium text-green-700">{h.hourly_rate_thb ? format(h.hours * h.hourly_rate_thb) : '—'}</td>
                <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{h.notes ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {canEdit   && <button onClick={() => openEdit(h)} className="text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>}
                    {canDelete && <button onClick={() => remove(h.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No records found.</div>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-2">
        {visible.map(h => (
          <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{h.staff_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(h.date)}{h.department ? ` · ${h.department}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{h.hours} <span className="text-xs font-normal text-slate-500">hrs</span></p>
                {h.hourly_rate_thb && <p className="text-xs text-green-700 font-medium">{format(h.hours * h.hourly_rate_thb)}</p>}
              </div>
            </div>
            {h.notes && <p className="text-xs text-slate-500 mt-2">{h.notes}</p>}
            <div className="flex gap-2 mt-3">
              {canEdit   && <button onClick={() => openEdit(h)} className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 border border-slate-200 rounded-lg py-1.5 hover:border-blue-400 hover:text-blue-600 transition-colors"><Pencil size={12} /> Edit</button>}
              {canDelete && <button onClick={() => remove(h.id)} className="text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-red-300 transition-colors"><Trash2 size={12} /></button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Clock size={36} className="mx-auto mb-3 opacity-30" />
            <p>No records found.</p>
          </div>
        )}
      </div>

      {visible.length < filtered.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
          >
            Load more ({filtered.length - visible.length} remaining)
          </button>
        </div>
      )}

      {open && (
        <Modal title={editing ? 'Edit Hours Entry' : 'Log Staff Hours'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Staff Name *</label>
              <input
                className="input"
                list="staff-datalist"
                value={form.staff_name ?? ''}
                onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))}
                placeholder="Type or select name"
              />
              <datalist id="staff-datalist">
                {staffNames.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="label">Role / Position</label><input className="input" placeholder="e.g. Receptionist" value={form.role ?? ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
            <div><label className="label">Department</label>
              <select className="input" value={form.department ?? ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">—</option>
                {STAFF_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="label">Hours Worked *</label><input type="number" step="0.5" min="0" max="24" className="input" value={form.hours ?? ''} onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="label">Hourly Rate (THB)</label><input type="number" step="1" min="0" className="input" placeholder="e.g. 350" value={form.hourly_rate_thb ?? ''} onChange={e => setForm(f => ({ ...f, hourly_rate_thb: e.target.value ? parseFloat(e.target.value) : undefined }))} /></div>
            {form.hours && form.hourly_rate_thb ? (
              <div className="sm:col-span-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium">Total Pay: <span className="text-base font-bold">{formatTHB(Number(form.hours) * Number(form.hourly_rate_thb))}</span></p>
              </div>
            ) : null}
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
