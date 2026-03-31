'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatTHB, MONTHS } from '@/types'
import type { BudgetRevenue, BudgetExpense, BudgetRent } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'

type Tab = 'dashboard' | 'revenue' | 'expenses' | 'rent'

const ROOMS_LIST = ['Room 1 - Renovated - Single', 'Room 2 - Renovated - Single', 'Room 3 - Renovated - Single',
  'Room 4 - Renovated - Single', 'Room 5 - Renovated - Single', 'Room 6', 'Room 7', 'Room 8', 'Room 9', 'Room 10']

export default function BudgetClient({
  initialRevenue, initialExpenses, initialRent
}: {
  initialRevenue: BudgetRevenue[]
  initialExpenses: BudgetExpense[]
  initialRent: BudgetRent[]
}) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [revenue, setRevenue] = useState(initialRevenue)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [rent, setRent] = useState(initialRent)
  const [year, setYear] = useState(2026)
  const [openModal, setOpenModal] = useState<null | 'revenue' | 'expense' | 'rent'>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AnyForm>({})
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyForm = Record<string, any>

  const yearRevenue = revenue.filter(r => r.year === year)
  const yearExpenses = expenses.filter(e => e.year === year)

  const monthlyRevenue = MONTHS.map((_, mi) => yearRevenue.filter(r => r.month === mi + 1).reduce((s, r) => s + r.amount_thb, 0))
  const monthlyOpex = MONTHS.map((_, mi) => yearExpenses.filter(e => e.month === mi + 1 && e.expense_type === 'OPEX').reduce((s, e) => s + e.amount_thb, 0))
  const monthlyCapex = MONTHS.map((_, mi) => yearExpenses.filter(e => e.month === mi + 1 && e.expense_type === 'CAPEX').reduce((s, e) => s + e.amount_thb, 0))
  const monthlyResult = MONTHS.map((_, mi) => monthlyRevenue[mi] - monthlyOpex[mi] - monthlyCapex[mi])

  const totalRevYr = monthlyRevenue.reduce((s, v) => s + v, 0)
  const totalOpexYr = monthlyOpex.reduce((s, v) => s + v, 0)
  const totalCapexYr = monthlyCapex.reduce((s, v) => s + v, 0)
  const totalResultYr = totalRevYr - totalOpexYr - totalCapexYr

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'rent', label: 'Rent Schedule' },
  ]

  return (
    <>
      <PageHeader title="Budget" subtitle="Annual budget planning and tracking" />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
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

      {tab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Revenue" value={formatTHB(totalRevYr)} color="green" sub={`Budget ${year}`} />
            <StatCard label="Total OPEX" value={formatTHB(totalOpexYr)} color="red" />
            <StatCard label="Total CAPEX" value={formatTHB(totalCapexYr)} color="yellow" />
            <StatCard label="Net Result" value={formatTHB(totalResultYr)} color={totalResultYr >= 0 ? 'green' : 'red'} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Line</th>
                  {MONTHS.map(m => <th key={m} className="text-right px-2 py-3 font-medium text-slate-600">{m}</th>)}
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Revenue', values: monthlyRevenue, total: totalRevYr, cls: 'text-green-600 font-semibold' },
                  { label: 'OPEX', values: monthlyOpex, total: totalOpexYr, cls: 'text-red-600 font-semibold' },
                  { label: 'CAPEX', values: monthlyCapex, total: totalCapexYr, cls: 'text-orange-600 font-semibold' },
                  { label: 'Result', values: monthlyResult, total: totalResultYr, cls: 'font-bold' },
                ].map(row => (
                  <tr key={row.label} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className={`px-2 py-2.5 text-right text-xs ${v < 0 ? 'text-red-500' : v > 0 ? row.cls : 'text-slate-300'}`}>
                        {v !== 0 ? formatTHB(v).replace('฿', '').replace(',', ',') : '—'}
                      </td>
                    ))}
                    <td className={`px-4 py-2.5 text-right ${row.cls}`}>{formatTHB(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'revenue' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingId(null); setForm({ year, month: 1, room_name: ROOMS_LIST[0], amount_thb: 0 }); setOpenModal('revenue') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus size={16} /> Add Entry
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Room</th>
                  {MONTHS.map(m => <th key={m} className="text-right px-2 py-3 font-medium text-slate-600">{m}</th>)}
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROOMS_LIST.map(room => {
                  const rowTotal = yearRevenue.filter(r => r.room_name === room).reduce((s, r) => s + r.amount_thb, 0)
                  return (
                    <tr key={room} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-sm">{room}</td>
                      {MONTHS.map((_, mi) => {
                        const entry = yearRevenue.find(r => r.room_name === room && r.month === mi + 1)
                        return (
                          <td key={mi} className="px-2 py-2.5 text-right text-xs">
                            {entry ? (
                              <button onClick={() => { setEditingId(entry.id); setForm(entry); setOpenModal('revenue') }}
                                className="text-green-600 hover:underline">{formatTHB(entry.amount_thb).replace('฿', '')}</button>
                            ) : '—'}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right font-semibold text-green-600">{rowTotal > 0 ? formatTHB(rowTotal) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'expenses' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingId(null); setForm({ year, month: 1, category: '', item_name: '', amount_thb: 0, expense_type: 'OPEX' }); setOpenModal('expense') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus size={16} /> Add Budget Item
            </button>
          </div>
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
                {yearExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.expense_type === 'OPEX' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{e.expense_type}</span></td>
                    <td className="px-4 py-2.5 text-slate-600">{e.category}</td>
                    <td className="px-4 py-2.5 font-medium">{e.item_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{MONTHS[e.month - 1]}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatTHB(e.amount_thb)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => { setEditingId(e.id); setForm(e); setOpenModal('expense') }} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'rent' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingId(null); setForm({ year_number: rent.length + 1, rent_thb: 0 }); setOpenModal('rent') }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus size={16} /> Add Year
            </button>
          </div>
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
                    <td className="px-4 py-2.5 text-right font-semibold">{formatTHB(r.rent_thb)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{formatTHB(r.rent_thb * 0.0266)}</td>
                    <td className="px-4 py-2.5 text-right">{formatTHB(r.rent_thb / 12)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => { setEditingId(r.id); setForm(r); setOpenModal('rent') }} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
            <div><label className="label">Season</label><input className="input" value={(form.season as string) ?? ''} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} /></div>
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
            <div className="sm:col-span-2"><label className="label">Item Name</label><input className="input" value={(form.item_name as string) ?? ''} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} /></div>
            <div><label className="label">Amount (THB)</label><input type="number" className="input" value={(form.amount_thb as number) ?? 0} onChange={e => setForm(f => ({ ...f, amount_thb: +e.target.value }))} /></div>
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
                <p>Monthly: <strong>{formatTHB((form.rent_thb as number) / 12)}</strong></p>
                <p>VAT (2.66%): <strong>{formatTHB((form.rent_thb as number) * 0.0266)}</strong></p>
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
