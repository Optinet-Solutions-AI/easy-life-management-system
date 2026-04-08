'use client'

import { useState, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, ScanText, X, Loader2, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, EXPENSE_CATEGORIES, PAYMENT_METHODS, SHAREHOLDERS } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import type { Expense } from '@/types'
import type { OcrResult } from '@/app/api/ocr/route'
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
  const { format } = useCurrency()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<Partial<Expense>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [legalOnly, setLegalOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<'payment_date' | 'category' | 'supplier' | 'amount'>('payment_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrFields, setOcrFields] = useState<Set<string>>(new Set())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const [previewIsPdf, setPreviewIsPdf] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const PAGE_SIZE = 10

  const filtered = useMemo(() => {
    setCurrentPage(1)
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

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0
    if (sortKey === 'payment_date') { av = a.payment_date ?? ''; bv = b.payment_date ?? '' }
    else if (sortKey === 'category') { av = (a.category ?? '').toLowerCase(); bv = (b.category ?? '').toLowerCase() }
    else if (sortKey === 'supplier') { av = (a.supplier ?? '').toLowerCase(); bv = (b.supplier ?? '').toLowerCase() }
    else if (sortKey === 'amount') { av = Math.abs(a.amount ?? 0); bv = Math.abs(b.amount ?? 0) }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setCurrentPage(1)
  }
  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-300 ml-1 inline" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-500 ml-1 inline" /> : <ChevronDown size={12} className="text-blue-500 ml-1 inline" />
  }

  const total = filtered.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0)

  const openNew = () => {
    setEditing(null); setForm(EMPTY)
    setOcrFields(new Set()); setOcrError(null); setPreviewUrl(null); setPreviewName(null); setPreviewIsPdf(false)
    setOpen(true)
  }
  const openEdit = (e: Expense) => {
    setEditing(e); setForm(e)
    setOcrFields(new Set()); setOcrError(null); setPreviewUrl(null); setPreviewName(null); setPreviewIsPdf(false)
    setOpen(true)
  }

  async function handleInvoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Show preview
    const isPdf = file.type === 'application/pdf'
    setPreviewIsPdf(isPdf)
    setPreviewName(file.name)
    if (!isPdf) {
      const reader = new FileReader()
      reader.onload = ev => setPreviewUrl(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl('pdf')
    }

    setOcrLoading(true)
    setOcrError(null)
    setOcrFields(new Set())

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = ev => {
          const dataUrl = ev.target?.result as string
          resolve(dataUrl.split(',')[1]) // strip data:image/...;base64,
        }
        r.onerror = reject
        r.readAsDataURL(file)
      })

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type || 'image/jpeg' }),
      })

      const json = await res.json() as { ok: boolean; data?: OcrResult; error?: string }

      if (!json.ok || !json.data) {
        throw new Error(json.error ?? 'OCR failed')
      }

      const d = json.data
      const filled = new Set<string>()

      // Map extracted fields → form, tracking which ones were filled
      const patch: Partial<Expense> = {}

      if (d.supplier) { patch.supplier = d.supplier; filled.add('supplier') }
      if (d.invoice_number) { patch.document_number = d.invoice_number; filled.add('document_number') }
      if (d.date) { patch.payment_date = d.date; filled.add('payment_date') }
      if (d.amount != null) { patch.amount = d.amount; filled.add('amount') }
      if (d.currency) { patch.currency = d.currency; filled.add('currency') }
      if (d.description) { patch.description = d.description; filled.add('description') }
      if (d.category && EXPENSE_CATEGORIES.includes(d.category)) {
        patch.category = d.category; filled.add('category')
      }

      setForm(prev => ({ ...prev, ...patch }))
      setOcrFields(filled)
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setOcrLoading(false)
    }
  }

  function clearOcr() {
    setPreviewUrl(null); setPreviewName(null); setPreviewIsPdf(false)
    setOcrFields(new Set()); setOcrError(null)
  }

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

  // Highlight class for OCR-filled fields
  const hl = (field: string) =>
    ocrFields.has(field) ? 'border-violet-400 bg-violet-50 focus:border-violet-500' : ''

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
        <StatCard label="Total Expenses" value={format(expenses.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0))} color="red" />
        <StatCard label="Filtered Total" value={format(total)} color={catFilter || search || legalOnly ? 'yellow' : 'default'} />
        <StatCard label="Legal Expenses" value={format(expenses.filter(e => e.is_legal).reduce((s, e) => s + Math.abs(e.amount ?? 0), 0))} color="blue" />
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
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('payment_date')}>Date <SortIcon col="payment_date" /></th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('category')}>Category <SortIcon col="category" /></th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('supplier')}>Supplier <SortIcon col="supplier" /></th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('amount')}>Amount <SortIcon col="amount" /></th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Paid By</th>
                <th className="text-left px-4 py-3 font-medium">Audit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{e.transaction_number ?? '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatDate(e.payment_date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium">{e.category}</span>
                    {e.subcategory && <span className="text-xs text-slate-400 block">{e.subcategory}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{e.supplier}</td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{e.description}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-600">{format(Math.abs(e.amount ?? 0))}</td>
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
                <td className="px-4 py-2.5 text-right font-bold text-red-600">{format(total)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === safePage ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
            ))}
            {totalPages > 10 && <span className="text-slate-400 text-sm px-1">…</span>}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {open && (
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setOpen(false)}>

          {/* ── OCR Invoice Upload (only when adding new) ── */}
          {!editing && (
            <div className="mb-5">
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={ocrLoading}
                  className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-violet-300 rounded-xl py-4 text-sm font-medium text-violet-600 hover:border-violet-500 hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  {ocrLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Analysing invoice…</>
                  ) : (
                    <><ScanText size={16} /> Upload invoice to auto-fill fields</>
                  )}
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {previewIsPdf ? (
                    <div className="flex items-center gap-3 px-4 py-5">
                      <FileText size={32} className="text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{previewName}</p>
                        <p className="text-xs text-slate-400">PDF document</p>
                      </div>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previewUrl!} alt="Invoice preview" className="max-h-48 w-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={clearOcr}
                    className="absolute top-2 right-2 bg-white border border-slate-200 rounded-full p-1 shadow text-slate-600 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm font-medium text-violet-700">
                      <Loader2 size={16} className="animate-spin" /> Analysing…
                    </div>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleInvoiceUpload} />

              {ocrError && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <X size={12} /> {ocrError}
                </p>
              )}
              {ocrFields.size > 0 && (
                <p className="mt-2 text-xs text-violet-600 font-medium">
                  ✦ {ocrFields.size} field{ocrFields.size > 1 ? 's' : ''} auto-filled — highlighted in purple. Review before saving.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Date</label>
              <input type="date" className={`input ${hl('payment_date')}`} value={form.payment_date ?? ''} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Transaction #</label>
              <input className="input" value={form.transaction_number ?? ''} onChange={e => setForm(f => ({ ...f, transaction_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Document # / Invoice #</label>
              <input className={`input ${hl('document_number')}`} value={form.document_number ?? ''} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className={`input ${hl('category')}`} value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">—</option>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subcategory</label>
              <input className="input" value={form.subcategory ?? ''} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} />
            </div>
            <div>
              <label className="label">Supplier</label>
              <input className={`input ${hl('supplier')}`} value={form.supplier ?? ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" className={`input ${hl('amount')}`} value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Currency</label>
              <input className={`input ${hl('currency')}`} value={form.currency ?? 'THB'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.method ?? ''} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option value="">—</option>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Paid By</label>
              <select className="input" value={form.paid_by ?? ''} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
                <option value="">—</option>{SHAREHOLDERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audit Status</label>
              <select className="input" value={form.audit ?? ''} onChange={e => setForm(f => ({ ...f, audit: e.target.value }))}>
                {['To check', 'Checked', 'YES'].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <input className="input" value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className={`input ${hl('description')}`} rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="legal" checked={form.is_legal ?? false} onChange={e => setForm(f => ({ ...f, is_legal: e.target.checked }))} />
              <label htmlFor="legal" className="text-sm font-medium text-slate-700">Shared with Legal</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={save} disabled={saving || ocrLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
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
