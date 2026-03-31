'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatTHB, formatDate, EXPENSE_CATEGORIES, PAYMENT_METHODS, SHAREHOLDERS } from '@/types'
import type { Expense } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'

const EMPTY: Partial<Expense> = {
  audit: 'To check', lawyers: '', sent: null, to_verify: '', payment_date: '',
  transaction_number: '', document_number: '', category: '', subcategory: '',
  supplier: '', amount: null, currency: 'THB', method: '', paid_by: '',
  internal_document: '', document_page: '', type: '', description: '', is_legal: false,
}

export default function ExpensesClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<Partial<Expense>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [legalOnly, setLegalOnly] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const filtered = useMemo(() => {
    setPage(1)
    return expenses.filter(e => {
    if (legalOnly && !e.is_legal) return false
    if (catFilter && e.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (e.supplier ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.transaction_number ?? '').toLowerCase().includes(q)
    }
    return true
  })
  }, [expenses, search, catFilter, legalOnly])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  const total = filtered.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (e: Expense) => { setEditing(e); setForm(e); setOpen(true) }

  async function save() {
    setSaving(true)
    if (editing) {
      const { data } = await supabase.from('expenses').update(form).eq('id', editing.id).select().single()
      if (data) setExpenses(prev => prev.map(e => e.id === editing.id ? data : e))
    } else {
      const { data } = await supabase.from('expenses').insert(form).select().single()
      if (data) setExpenses(prev => [data, ...prev])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const auditColors: Record<string, string> = {
    'To check': 'bg-yellow-100 text-yellow-700',
    'Checked': 'bg-green-100 text-green-700',
    'YES': 'bg-green-100 text-green-700',
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} records`}
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Expense
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Expenses" value={formatTHB(expenses.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0))} color="red" />
        <StatCard label="Filtered Total" value={formatTHB(total)} color={catFilter || search || legalOnly ? 'yellow' : 'default'} />
        <StatCard label="Legal Expenses" value={formatTHB(expenses.filter(e => e.is_legal).reduce((s, e) => s + Math.abs(e.amount ?? 0), 0))} color="blue" />
        <StatCard label="Records" value={filtered.length.toString()} sub={`of ${expenses.length} total`} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <div className="relative flex-1 sm:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 w-full" placeholder="Search supplier, description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto min-w-[140px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
          <input type="checkbox" checked={legalOnly} onChange={e => setLegalOnly(e.target.checked)} />
          Legal only
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Ref</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Paid By</th>
                <th className="text-left px-4 py-3 font-medium">Audit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{e.transaction_number ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatDate(e.payment_date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium">{e.category}</span>
                    {e.subcategory && <span className="text-xs text-slate-400 block">{e.subcategory}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{e.supplier}</td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{e.description}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-600">{formatTHB(Math.abs(e.amount ?? 0))}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.method}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.paid_by}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${auditColors[e.audit ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                      {e.audit ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                      <button onClick={() => remove(e.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold text-slate-600">Filtered Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatTHB(total)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
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
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Payment Date</label><input type="date" className="input" value={form.payment_date ?? ''} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            <div><label className="label">Transaction #</label><input className="input" value={form.transaction_number ?? ''} onChange={e => setForm(f => ({ ...f, transaction_number: e.target.value }))} /></div>
            <div><label className="label">Document #</label><input className="input" value={form.document_number ?? ''} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} /></div>
            <div><label className="label">Category</label>
              <select className="input" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">—</option>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Subcategory</label><input className="input" value={form.subcategory ?? ''} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} /></div>
            <div><label className="label">Supplier</label><input className="input" value={form.supplier ?? ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            <div><label className="label">Amount (THB)</label><input type="number" className="input" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} /></div>
            <div><label className="label">Currency</label><input className="input" value={form.currency ?? 'THB'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
            <div><label className="label">Payment Method</label>
              <select className="input" value={form.method ?? ''} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option value="">—</option>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Paid By</label>
              <select className="input" value={form.paid_by ?? ''} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
                <option value="">—</option>{SHAREHOLDERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Audit Status</label>
              <select className="input" value={form.audit ?? ''} onChange={e => setForm(f => ({ ...f, audit: e.target.value }))}>
                {['To check', 'Checked', 'YES'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div><label className="label">Type</label><input className="input" value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="legal" checked={form.is_legal ?? false} onChange={e => setForm(f => ({ ...f, is_legal: e.target.checked }))} />
              <label htmlFor="legal" className="text-sm font-medium text-slate-700">Shared with Legal</label>
            </div>
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
