'use client'

import { useState, useRef } from 'react'
import { Trash2, Upload, AlertTriangle, CheckCircle, Loader2, FileSpreadsheet, RotateCcw } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

const TABLES = [
  { key: 'guests',                label: 'Guests',                 desc: 'Guest stays & bookings' },
  { key: 'expenses',              label: 'Expenses',               desc: 'All expense records' },
  { key: 'revenue',               label: 'Revenue',                desc: 'Revenue entries' },
  { key: 'founding_contributions',label: 'Founding Contributions', desc: 'Shareholder founding contributions' },
  { key: 'shareholder_work',      label: 'Shareholder Work',       desc: 'Work hours by shareholder' },
  { key: 'todos',                 label: 'Tasks',                  desc: 'To-do / task items' },
  { key: 'budget_rent',           label: 'Budget Rent',            desc: 'Rent schedule by year' },
  { key: 'budget_revenue',        label: 'Budget Revenue',         desc: 'Budgeted revenue by room/month' },
  { key: 'budget_expenses',       label: 'Budget Expenses',        desc: 'Budgeted expense items' },
]

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function DataClient() {
  const [resetStatus, setResetStatus] = useState<Record<string, Status>>({})
  const [resetLog, setResetLog] = useState<Record<string, string>>({})
  const [importStatus, setImportStatus] = useState<Status>('idle')
  const [importLog, setImportLog] = useState<string[]>([])
  const [confirmAll, setConfirmAll] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function resetTable(table: string) {
    if (!confirm(`Clear all data from "${table}"? This cannot be undone.`)) return
    setResetStatus(s => ({ ...s, [table]: 'loading' }))
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table }),
    })
    const data = await res.json()
    const msg = data.results?.[table] ?? data.error ?? 'unknown'
    setResetStatus(s => ({ ...s, [table]: msg === 'cleared' ? 'done' : 'error' }))
    setResetLog(l => ({ ...l, [table]: msg }))
    setTimeout(() => setResetStatus(s => ({ ...s, [table]: 'idle' })), 3000)
  }

  async function resetAll() {
    if (!confirm('⚠️ This will DELETE ALL data from every table. Are you absolutely sure?')) return
    setConfirmAll(false)
    setResetStatus(Object.fromEntries(TABLES.map(t => [t.key, 'loading'])))
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'ALL' }),
    })
    const data = await res.json()
    const results: Record<string, Status> = {}
    const logs: Record<string, string> = {}
    for (const t of TABLES) {
      const msg = data.results?.[t.key] ?? 'unknown'
      results[t.key] = msg === 'cleared' ? 'done' : 'error'
      logs[t.key] = msg
    }
    setResetStatus(results)
    setResetLog(logs)
    setTimeout(() => setResetStatus({}), 4000)
  }

  async function importExcel() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setImportStatus('loading')
    setImportLog([])
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/import-excel', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      setImportStatus('error')
      setImportLog([data.error ?? 'Import failed'])
      return
    }
    setImportStatus('done')
    setImportLog(data.log ?? [])
  }

  function StatusIcon({ status }: { status: Status }) {
    if (status === 'loading') return <Loader2 size={14} className="animate-spin text-blue-500" />
    if (status === 'done') return <CheckCircle size={14} className="text-green-600" />
    if (status === 'error') return <AlertTriangle size={14} className="text-red-500" />
    return null
  }

  return (
    <>
      <PageHeader
        title="Data Management"
        subtitle="Reset tables or re-import from Excel — admin only"
      />

      {/* ── Reset section ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Reset Tables</h2>
        <p className="text-xs text-slate-400 mb-4">Permanently deletes all rows from the selected table. Cannot be undone.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {TABLES.map(t => (
            <div key={t.key} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{t.label}</p>
                <p className="text-xs text-slate-400 truncate">{t.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusIcon status={resetStatus[t.key] ?? 'idle'} />
                {resetLog[t.key] && resetStatus[t.key] === 'idle' && (
                  <span className="text-xs text-slate-400">{resetLog[t.key]}</span>
                )}
                <button
                  onClick={() => resetTable(t.key)}
                  disabled={resetStatus[t.key] === 'loading'}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  title={`Clear ${t.label}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={confirmAll} onChange={e => setConfirmAll(e.target.checked)} className="w-4 h-4 accent-red-600" />
              I understand this will erase all data permanently
            </label>
            <button
              onClick={resetAll}
              disabled={!confirmAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={14} /> Reset All Tables
            </button>
          </div>
        </div>
      </div>

      {/* ── Import section ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Import from Excel</h2>
        <p className="text-xs text-slate-400 mb-4">
          Upload your <span className="font-medium text-slate-600">Easy Life – Management Board.xlsx</span> file.
          Data is appended (existing rows are kept). Run a reset first if you want a clean import.
        </p>

        <div className="flex items-start gap-4 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg cursor-pointer text-sm text-slate-500 hover:text-blue-600 transition-colors">
            <FileSpreadsheet size={16} />
            <span>{fileRef.current?.files?.[0]?.name ?? 'Choose .xlsx file'}</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={() => setImportStatus('idle')} />
          </label>
          <button
            onClick={importExcel}
            disabled={importStatus === 'loading'}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {importStatus === 'loading'
              ? <><Loader2 size={15} className="animate-spin" /> Importing…</>
              : <><Upload size={15} /> Import Data</>
            }
          </button>
        </div>

        {importLog.length > 0 && (
          <div className={`mt-4 rounded-lg border p-4 ${importStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Import Log</p>
            <div className="space-y-1">
              {importLog.map((line, i) => (
                <p key={i} className={`text-xs font-mono ${line.includes('ERROR') ? 'text-red-600' : 'text-slate-700'}`}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
