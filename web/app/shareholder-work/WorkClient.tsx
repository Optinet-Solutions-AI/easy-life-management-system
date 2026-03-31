'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SHAREHOLDERS } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import type { ShareholderWork } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'

const EMPTY: Partial<ShareholderWork> = { month: '', shareholder: '', hours: 0, hour_rate: 200 }

export default function WorkClient({ initialWork }: { initialWork: ShareholderWork[] }) {
  const { format } = useCurrency()
  const [work, setWork] = useState<ShareholderWork[]>(initialWork)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ShareholderWork | null>(null)
  const [form, setForm] = useState<Partial<ShareholderWork>>(EMPTY)
  const [saving, setSaving] = useState(false)

  const perShareholder = useMemo(() => SHAREHOLDERS.map(name => {
    const records = work.filter(w => w.shareholder === name)
    const totalHours = records.reduce((s, w) => s + (w.hours ?? 0), 0)
    const totalTHB = records.reduce((s, w) => s + (w.hours ?? 0) * (w.hour_rate ?? 200), 0)
    return { name, totalHours, totalTHB }
  }), [work])

  const grandTotalTHB = work.reduce((s, w) => s + (w.hours ?? 0) * (w.hour_rate ?? 200), 0)

  // Group by month for display
  const byMonth = useMemo(() => {
    const map = new Map<string, ShareholderWork[]>()
    work.forEach(w => {
      const m = w.month?.slice(0, 7) ?? 'Unknown'
      if (!map.has(m)) map.set(m, [])
      map.get(m)!.push(w)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [work])

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (w: ShareholderWork) => { setEditing(w); setForm(w); setOpen(true) }

  async function save() {
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('shareholder_work').update(form).eq('id', editing.id).select().single()
      if (data) setWork(prev => prev.map(w => w.id === editing.id ? data : w))
    } else {
      const { data } = await supabase.from('shareholder_work').insert(form).select().single()
      if (data) setWork(prev => [data, ...prev])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this record?')) return
    await supabase.from('shareholder_work').delete().eq('id', id)
    setWork(prev => prev.filter(w => w.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Shareholder Work"
        subtitle="Hours logged at 200 THB/hr"
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Log Hours
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {perShareholder.map(({ name, totalHours, totalTHB }) => (
          <StatCard key={name} label={name.split(' ')[0]} value={format(totalTHB)} sub={`${totalHours} hrs`} color="blue" />
        ))}
      </div>
      <div className="mb-6"><StatCard label="Grand Total" value={format(grandTotalTHB)} color="blue" /></div>

      <div className="space-y-4">
        {byMonth.map(([monthKey, records]) => {
          const monthTotal = records.reduce((s, w) => s + (w.hours ?? 0) * (w.hour_rate ?? 200), 0)
          const date = new Date(monthKey + '-01')
          const label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          return (
            <div key={monthKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">{label}</h3>
                <span className="text-sm font-medium text-blue-600">{format(monthTotal)}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Shareholder</th>
                    <th className="text-right px-4 py-2 font-medium">Hours</th>
                    <th className="text-right px-4 py-2 font-medium">Rate (THB/hr)</th>
                    <th className="text-right px-4 py-2 font-medium">Total (THB)</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium">{w.shareholder}</td>
                      <td className="px-4 py-2.5 text-right">{w.hours}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{w.hour_rate}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{format((w.hours ?? 0) * (w.hour_rate ?? 200))}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(w)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                          <button onClick={() => remove(w.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {open && (
        <Modal title={editing ? 'Edit Work Log' : 'Log Hours'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Month</label><input type="month" className="input" value={form.month?.slice(0, 7) ?? ''} onChange={e => setForm(f => ({ ...f, month: e.target.value + '-01' }))} /></div>
            <div><label className="label">Shareholder</label>
              <select className="input" value={form.shareholder ?? ''} onChange={e => setForm(f => ({ ...f, shareholder: e.target.value }))}>
                <option value="">—</option>{SHAREHOLDERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Hours</label><input type="number" className="input" value={form.hours ?? 0} onChange={e => setForm(f => ({ ...f, hours: +e.target.value }))} /></div>
            <div><label className="label">Rate (THB/hr)</label><input type="number" className="input" value={form.hour_rate ?? 200} onChange={e => setForm(f => ({ ...f, hour_rate: +e.target.value }))} /></div>
            {form.hours != null && form.hour_rate != null && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Total: <strong>{format(form.hours * form.hour_rate)}</strong>
              </div>
            )}
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
