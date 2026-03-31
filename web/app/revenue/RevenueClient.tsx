'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import type { Revenue } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'

const EMPTY: Partial<Revenue> = { date: '', type: '', supplier: '', amount_thb: null, notes: '' }

interface GuestPayment { check_in: string; check_out: string; amount_thb_stay: number | null; payment: number | null; guest_name: string }

export default function RevenueClient({ initialRevenue, guestPayments }: { initialRevenue: Revenue[]; guestPayments: GuestPayment[] }) {
  const { format } = useCurrency()
  const [revenues, setRevenues] = useState<Revenue[]>(initialRevenue)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Revenue | null>(null)
  const [form, setForm] = useState<Partial<Revenue>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50
  const visible = revenues.slice(0, page * PAGE_SIZE)

  const totalRevenue = revenues.reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  const totalGuestPayments = guestPayments.reduce((s, g) => s + (g.payment ?? 0), 0)
  const outstanding = guestPayments.reduce((s, g) => s + ((g.amount_thb_stay ?? 0) - (g.payment ?? 0)), 0)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (r: Revenue) => { setEditing(r); setForm(r); setOpen(true) }

  async function save() {
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('revenue').update(form).eq('id', editing.id).select().single()
      if (data) setRevenues(prev => prev.map(r => r.id === editing.id ? data : r))
    } else {
      const { data } = await supabase.from('revenue').insert(form).select().single()
      if (data) setRevenues(prev => [data, ...prev])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this revenue record?')) return
    await supabase.from('revenue').delete().eq('id', id)
    setRevenues(prev => prev.filter(r => r.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Revenue"
        subtitle="Room income and other revenue"
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Revenue
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue Logged" value={format(totalRevenue)} color="green" />
        <StatCard label="Total Guest Payments" value={format(totalGuestPayments)} color="green" sub="Sum of paid amounts in Guests" />
        <StatCard label="Outstanding from Guests" value={format(outstanding)} color={outstanding > 0 ? 'red' : 'default'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Supplier / Source</th>
              <th className="text-right px-4 py-3 font-medium">Amount (THB)</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">{formatDate(r.date)}</td>
                <td className="px-4 py-2.5 font-medium">{r.type}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.supplier}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-green-600">{format(r.amount_thb)}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{r.notes}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(r.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            <tr>
              <td colSpan={3} className="px-4 py-2.5 font-semibold text-slate-600">Total</td>
              <td className="px-4 py-2.5 text-right font-bold text-green-600">{format(totalRevenue)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {visible.length < revenues.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
          >
            Load more ({revenues.length - visible.length} remaining)
          </button>
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
