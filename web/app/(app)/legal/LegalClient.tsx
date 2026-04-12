'use client'

import { useState, useMemo, useRef } from 'react'
import { CheckCircle2, HelpCircle, XCircle, Download, Printer, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTHB, MONTHS, LEGAL_STATUSES } from '@/types'
import type { Expense, LegalStatus } from '@/types'
import { useCurrency } from '@/context/CurrencyContext'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'
import { usePermissions } from '@/context/PermissionsContext'

const STATUS_STYLE: Record<string, { badge: string; icon: React.ReactNode }> = {
  Accepted:              { badge: 'bg-green-100 text-green-700',   icon: <CheckCircle2 size={13} className="text-green-600" /> },
  'Clarification Needed':{ badge: 'bg-yellow-100 text-yellow-700', icon: <HelpCircle size={13} className="text-yellow-600" /> },
  Rejected:              { badge: 'bg-red-100 text-red-700',       icon: <XCircle size={13} className="text-red-600" /> },
  Pending:               { badge: 'bg-slate-100 text-slate-600',   icon: <FileText size={13} className="text-slate-400" /> },
}

interface ReviewForm {
  status: LegalStatus
  notes: string
  reviewed_at: string
}

export default function LegalClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const { format } = useCurrency()
  const { can } = usePermissions()
  const canEdit = can('legal', 'edit')
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [reviewing, setReviewing] = useState<Expense | null>(null)
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ status: 'Accepted', notes: '', reviewed_at: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  // Filters
  const now = new Date()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [groupLimits, setGroupLimits] = useState<Record<string, number>>({})
  const GROUP_DEFAULT = 10
  function groupLimit(status: string) { return groupLimits[status] ?? GROUP_DEFAULT }
  function showMore(status: string, total: number) {
    setGroupLimits(prev => ({ ...prev, [status]: total }))
  }

  const printRef = useRef<HTMLDivElement>(null)

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => expenses.filter(e => {
    if (filterStatus !== 'all' && (e.legal_status ?? 'Pending') !== filterStatus) return false
    if (!e.payment_date) return filterMonth === 'all'
    const d = new Date(e.payment_date)
    if (d.getFullYear() !== filterYear) return false
    if (filterMonth !== 'all' && d.getMonth() + 1 !== filterMonth) return false
    return true
  }), [expenses, filterStatus, filterYear, filterMonth])

  // ── KPI counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const base = filterMonth === 'all'
      ? expenses.filter(e => !e.payment_date || new Date(e.payment_date).getFullYear() === filterYear)
      : expenses.filter(e => {
          if (!e.payment_date) return false
          const d = new Date(e.payment_date)
          return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth
        })
    return {
      total: base.length,
      pending: base.filter(e => !e.legal_status || e.legal_status === 'Pending').length,
      accepted: base.filter(e => e.legal_status === 'Accepted').length,
      clarification: base.filter(e => e.legal_status === 'Clarification Needed').length,
      rejected: base.filter(e => e.legal_status === 'Rejected').length,
      totalAmount: base.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0),
    }
  }, [expenses, filterYear, filterMonth])

  // ── Open review modal ─────────────────────────────────────────────────────
  function openReview(expense: Expense, status: LegalStatus) {
    setReviewing(expense)
    setReviewForm({
      status,
      notes: expense.legal_notes ?? '',
      reviewed_at: expense.legal_reviewed_at ?? new Date().toISOString().split('T')[0],
    })
  }

  // ── Save review ───────────────────────────────────────────────────────────
  async function saveReview() {
    if (!reviewing) return
    setSaving(true)
    const patch = {
      legal_status: reviewForm.status,
      legal_notes: reviewForm.notes || null,
      legal_reviewed_at: reviewForm.reviewed_at || null,
    }
    const { data } = await supabase.from('expenses').update(patch).eq('id', reviewing.id).select().single()
    if (data) setExpenses(prev => prev.map(e => e.id === reviewing.id ? data : e))
    setSaving(false)
    setReviewing(null)
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const monthLabel = filterMonth === 'all' ? `${filterYear}` : `${filterYear}-${String(filterMonth).padStart(2, '0')}`
    const rows: string[] = [
      'Status,Date,Supplier,Invoice #,Category,Amount,Currency,Description,Legal Notes,Reviewed Date',
    ]

    const orderedStatuses: LegalStatus[] = ['Accepted', 'Clarification Needed', 'Rejected', 'Pending']
    for (const status of orderedStatuses) {
      const group = filtered.filter(e => (e.legal_status ?? 'Pending') === status)
      if (group.length === 0) continue
      rows.push(`\n--- ${status.toUpperCase()} (${group.length} records) ---`)
      for (const e of group) {
        const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`
        rows.push([
          esc(status),
          esc(e.payment_date),
          esc(e.supplier),
          esc(e.document_number),
          esc(e.category),
          String(Math.abs(e.amount ?? 0)),
          esc(e.currency),
          esc(e.description),
          esc(e.legal_notes),
          esc(e.legal_reviewed_at),
        ].join(','))
      }
      rows.push(`"Subtotal","","","","",${group.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0)}`)
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `legal-expenses-${monthLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Print PDF ─────────────────────────────────────────────────────────────
  function printReport() { window.print() }

  const monthLabel = filterMonth === 'all'
    ? `Full Year ${filterYear}`
    : `${MONTHS[(filterMonth as number) - 1]} ${filterYear}`

  return (
    <>
      <PageHeader
        title="Legal / Accounting"
        subtitle={`${counts.total} legal expenses · ${monthLabel}`}
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 border border-slate-200 bg-white hover:border-slate-400 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg">
              <Download size={14} /> CSV
            </button>
            <button onClick={printReport} className="flex items-center gap-1.5 border border-slate-200 bg-white hover:border-slate-400 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg print:hidden">
              <Printer size={14} /> Print
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 print:hidden">
        <StatCard label="Total" value={counts.total.toString()} sub={format(counts.totalAmount)} />
        <StatCard label="Pending" value={counts.pending.toString()} color="default" />
        <StatCard label="Accepted" value={counts.accepted.toString()} color="green" />
        <StatCard label="Clarification" value={counts.clarification.toString()} color="yellow" />
        <StatCard label="Rejected" value={counts.rejected.toString()} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 print:hidden">
        <select className="input w-auto" value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="input w-auto" value={filterMonth} onChange={e => setFilterMonth(e.target.value === 'all' ? 'all' : +e.target.value)}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {['all', ...LEGAL_STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filterStatus === s ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Print header (hidden on screen) ─────────────────────────────── */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Legal Expenses Report</h1>
        <p className="text-sm text-slate-600 mt-1">{monthLabel} · Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-8 mt-3 text-sm">
          <span>Total: <strong>{counts.total}</strong></span>
          <span>Accepted: <strong>{counts.accepted}</strong></span>
          <span>Pending: <strong>{counts.pending}</strong></span>
          <span>Clarification: <strong>{counts.clarification}</strong></span>
          <span>Rejected: <strong>{counts.rejected}</strong></span>
        </div>
      </div>

      {/* ── Grouped by status (print view) ──────────────────────────────── */}
      <div ref={printRef}>
        {(['Accepted', 'Clarification Needed', 'Rejected', 'Pending'] as LegalStatus[]).map(status => {
          const group = filtered.filter(e => (e.legal_status ?? 'Pending') === status)
          if (group.length === 0) return null
          const visibleGroup = group.slice(0, groupLimit(status))
          const groupTotal = group.reduce((s, e) => s + Math.abs(e.amount ?? 0), 0)
          const style = STATUS_STYLE[status]

          return (
            <div key={status} className="mb-6 print:mb-8">
              {/* Group header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {style.icon}
                  <span className="font-semibold text-slate-800">{status}</span>
                  <span className="text-xs text-slate-400">({group.length})</span>
                </div>
                <span className="text-sm font-semibold text-slate-700">{format(groupTotal)}</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice #</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reviewed</th>
                        <th className="px-4 py-2.5 print:hidden" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleGroup.map(e => {
                        const isExpanded = expanded === e.id
                        return (
                          <>
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(e.payment_date)}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">{e.supplier ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-xs">{e.document_number ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-500">{e.category ?? '—'}</td>
                              <td className="px-4 py-3 text-right font-semibold">{format(Math.abs(e.amount ?? 0))}{e.currency !== 'THB' && <span className="text-xs text-slate-400 ml-1">{e.currency}</span>}</td>
                              <td className="px-4 py-3 text-slate-500 max-w-xs">
                                {e.legal_notes ? (
                                  <span className="text-xs italic truncate block max-w-[200px]">{e.legal_notes}</span>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{e.legal_reviewed_at ? formatDate(e.legal_reviewed_at) : '—'}</td>
                              <td className="px-4 py-3 print:hidden">
                                <div className="flex gap-1">
                                  {canEdit && <button onClick={() => openReview(e, 'Accepted')} title="Accept" className="p-1 rounded hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"><CheckCircle2 size={15} /></button>}
                                  {canEdit && <button onClick={() => openReview(e, 'Clarification Needed')} title="Request clarification" className="p-1 rounded hover:bg-yellow-50 text-slate-400 hover:text-yellow-600 transition-colors"><HelpCircle size={15} /></button>}
                                  {canEdit && <button onClick={() => openReview(e, 'Rejected')} title="Reject" className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><XCircle size={15} /></button>}
                                  <button onClick={() => setExpanded(isExpanded ? null : e.id)} className="p-1 rounded text-slate-300 hover:text-slate-600 transition-colors">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${e.id}-detail`} className="bg-slate-50 print:hidden">
                                <td colSpan={8} className="px-4 py-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                                    <div><span className="font-medium block text-slate-400 uppercase tracking-wide mb-0.5">Description</span>{e.description ?? '—'}</div>
                                    <div><span className="font-medium block text-slate-400 uppercase tracking-wide mb-0.5">Method</span>{e.method ?? '—'}</div>
                                    <div><span className="font-medium block text-slate-400 uppercase tracking-wide mb-0.5">Paid By</span>{e.paid_by ?? '—'}</div>
                                    <div><span className="font-medium block text-slate-400 uppercase tracking-wide mb-0.5">Type</span>{e.type ?? '—'}</div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-slate-600">Subtotal — {status}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">{format(groupTotal)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {visibleGroup.map(e => (
                    <div key={e.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{e.supplier ?? '—'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{formatDate(e.payment_date)} · {e.category ?? '—'}</p>
                          {e.legal_notes && <p className="text-xs text-slate-500 italic mt-1">{e.legal_notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900">{format(Math.abs(e.amount ?? 0))}</p>
                          {e.legal_reviewed_at && <p className="text-xs text-slate-400 mt-0.5">{formatDate(e.legal_reviewed_at)}</p>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => openReview(e, 'Accepted')} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50"><CheckCircle2 size={12} /> Accept</button>
                          <button onClick={() => openReview(e, 'Clarification Needed')} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-yellow-200 text-yellow-700 hover:bg-yellow-50"><HelpCircle size={12} /> Clarify</button>
                          <button onClick={() => openReview(e, 'Rejected')} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><XCircle size={12} /> Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Show more */}
              {group.length > groupLimit(status) && (
                <div className="px-4 py-2.5 border-t border-slate-100 text-center print:hidden">
                  <button onClick={() => showMore(status, group.length)} className="text-xs text-blue-600 hover:underline font-medium">
                    Show {group.length - groupLimit(status)} more ({group.length} total)
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No legal expenses found for the selected filters.</p>
          </div>
        )}
      </div>

      {/* ── Review modal ──────────────────────────────────────────────────── */}
      {reviewing && (
        <Modal title="Review Expense" onClose={() => setReviewing(null)}>
          {/* Expense summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{reviewing.supplier ?? '—'}</p>
                <p className="text-sm text-slate-500">{formatDate(reviewing.payment_date)}</p>
              </div>
              <p className="font-bold text-lg text-slate-900 shrink-0">{format(Math.abs(reviewing.amount ?? 0))}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
              {reviewing.document_number && <span>Invoice: {reviewing.document_number}</span>}
              {reviewing.category && <span>Category: {reviewing.category}</span>}
              {reviewing.description && <span className="italic">{reviewing.description}</span>}
            </div>
          </div>

          <div className="space-y-4">
            {/* Status selector */}
            <div>
              <label className="label">Decision</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Accepted', 'Clarification Needed', 'Rejected'] as LegalStatus[]).map(s => {
                  const style = STATUS_STYLE[s]
                  const active = reviewForm.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewForm(f => ({ ...f, status: s }))}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                        active
                          ? s === 'Accepted' ? 'border-green-500 bg-green-50 text-green-700'
                          : s === 'Clarification Needed' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {style.icon}
                      {s === 'Clarification Needed' ? 'Clarify' : s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="label">Notes / Reason</label>
              <textarea
                className="input"
                rows={3}
                placeholder={
                  reviewForm.status === 'Clarification Needed' ? 'What clarification is needed?'
                  : reviewForm.status === 'Rejected' ? 'Reason for rejection…'
                  : 'Optional notes…'
                }
                value={reviewForm.notes}
                onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Review Date</label>
              <input
                type="date"
                className="input"
                value={reviewForm.reviewed_at}
                onChange={e => setReviewForm(f => ({ ...f, reviewed_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setReviewing(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button
              onClick={saveReview}
              disabled={saving}
              className={`px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 ${
                reviewForm.status === 'Accepted' ? 'bg-green-600 hover:bg-green-700'
                : reviewForm.status === 'Rejected' ? 'bg-red-600 hover:bg-red-700'
                : 'bg-yellow-500 hover:bg-yellow-600'
              }`}
            >
              {saving ? 'Saving…' : `Confirm ${reviewForm.status === 'Clarification Needed' ? 'Clarification' : reviewForm.status}`}
            </button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #64748b; margin-bottom: 4px; }
        .input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

        @media print {
          body { background: white; }
          nav, aside, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </>
  )
}
