'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Eye, EyeOff, CheckCircle2, Trash2, Upload, AlertTriangle, CheckCircle,
  Loader2, FileSpreadsheet, RotateCcw, KeyRound, Database, Download,
  UserCog, Plus, ShieldCheck, Search,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

// ── Password strength ─────────────────────────────────────────────────────────

function strength(pw: string) {
  if (!pw) return null
  if (pw.length < 8) return { label: 'Too short', bar: 'bg-red-400',    width: 'w-1/4',  color: 'text-red-500' }
  const score = [/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length
  if (score === 0) return { label: 'Weak',      bar: 'bg-orange-400', width: 'w-2/4',  color: 'text-orange-500' }
  if (score === 1) return { label: 'Good',      bar: 'bg-yellow-400', width: 'w-3/4',  color: 'text-yellow-600' }
  return              { label: 'Strong',    bar: 'bg-green-500',  width: 'w-full', color: 'text-green-600' }
}

// ── Tables ────────────────────────────────────────────────────────────────────

const TABLES = [
  { key: 'guests',                 label: 'Guests',                 desc: 'Guest stays & bookings' },
  { key: 'expenses',               label: 'Expenses',               desc: 'All expense records' },
  { key: 'revenue',                label: 'Revenue',                desc: 'Revenue entries' },
  { key: 'founding_contributions', label: 'Founding Contributions', desc: 'Shareholder founding contributions' },
  { key: 'shareholder_work',       label: 'Shareholder Work',       desc: 'Work hours by shareholder' },
  { key: 'todos',                  label: 'Tasks',                  desc: 'To-do items' },
  { key: 'budget_rent',            label: 'Budget Rent',            desc: 'Rent schedule by year' },
  { key: 'budget_revenue',         label: 'Budget Revenue',         desc: 'Budgeted revenue by room/month' },
  { key: 'budget_expenses',        label: 'Budget Expenses',        desc: 'Budgeted expense items' },
  { key: 'complaints',             label: 'Complaints',             desc: 'Guest complaint records' },
  { key: 'staff_hours',            label: 'Staff Hours',            desc: 'Staff working hours log' },
  { key: 'shareholder_meetings',   label: 'SH Meetings',            desc: 'Shareholder meeting records' },
  { key: 'shareholder_profiles',   label: 'SH Profiles',            desc: 'Shareholder profile data' },
]

// ── Users ─────────────────────────────────────────────────────────────────────

const ROLES = ['Admin', 'General Manager', 'Shareholder', 'Lawyer', 'Accountant']
const ROLE_COLORS: Record<string, string> = {
  'Admin':           'bg-purple-100 text-purple-700',
  'Shareholder':     'bg-blue-100 text-blue-700',
  'General Manager': 'bg-teal-100 text-teal-700',
  'Lawyer':          'bg-amber-100 text-amber-700',
  'Accountant':      'bg-orange-100 text-orange-700',
}

interface User {
  id: string
  username: string
  display_name: string
  role: string
  created_at: string
}

interface AddForm {
  username: string; display_name: string; role: string
  password: string; confirm_password: string
}

const EMPTY_ADD: AddForm = { username: '', display_name: '', role: 'Shareholder', password: '', confirm_password: '' }

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'password', label: 'Update Password', icon: KeyRound },
  { id: 'users',    label: 'User Management', icon: UserCog  },
  { id: 'import',   label: 'Import Data',     icon: Upload   },
  { id: 'export',   label: 'Export Data',     icon: Download },
  { id: 'reset',    label: 'Reset Data',      icon: Trash2   },
]

type ResetStatus = 'idle' | 'loading' | 'done' | 'error'

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsClient({
  isAdmin,
  currentUserId,
  initialUsers,
}: {
  isAdmin: boolean
  currentUserId: string
  initialUsers: User[]
}) {

  // ── Active nav section ────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('password')

  useEffect(() => {
    const ids = isAdmin ? NAV_ITEMS.map(n => n.id) : ['password']
    const scroller = document.querySelector('main') ?? window
    function onScroll() {
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i])
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(ids[i]); return
        }
      }
      setActiveSection('password')
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [isAdmin])

  function scrollTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Password state ────────────────────────────────────────────────────────
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [show, setShow]           = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError, setPwError]     = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const pw = strength(pwForm.next)

  // ── User management state ─────────────────────────────────────────────────
  const [users, setUsers]           = useState<User[]>(initialUsers)
  const [search, setSearch]         = useState('')
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.display_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  }, [users, search])
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState<AddForm>(EMPTY_ADD)
  const [addError, setAddError]     = useState<string | null>(null)
  const [addSaving, setAddSaving]   = useState(false)
  const [resetTarget, setResetTarget]     = useState<User | null>(null)
  const [resetPw, setResetPw]             = useState('')
  const [resetConfirm, setResetConfirm]   = useState('')
  const [resetUErr, setResetUErr]         = useState<string | null>(null)
  const [resetUSaving, setResetUSaving]   = useState(false)
  const [resetUSuccess, setResetUSuccess] = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<User | null>(null)
  const [deleteSaving, setDeleteSaving]   = useState(false)

  // ── Table reset state ─────────────────────────────────────────────────────
  const [resetStatus, setResetStatus] = useState<Record<string, ResetStatus>>({})
  const [resetLog,    setResetLog]    = useState<Record<string, string>>({})
  const [confirmAll,  setConfirmAll]  = useState(false)

  // ── Import state ──────────────────────────────────────────────────────────
  const [importStatus, setImportStatus] = useState<ResetStatus>('idle')
  const [importLog,    setImportLog]    = useState<string[]>([])
  const [fileName,     setFileName]     = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Handlers: password ───────────────────────────────────────────────────
  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null); setPwSuccess(false)
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    if (pwForm.next.length < 8)        { setPwError('Password must be at least 8 characters'); return }
    setPwSaving(true)
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      })
      const json = await res.json()
      if (!res.ok) setPwError(json.error ?? 'Failed to change password')
      else { setPwSuccess(true); setPwForm({ current: '', next: '', confirm: '' }) }
    } catch { setPwError('Network error — please try again') }
    finally { setPwSaving(false) }
  }

  // ── Handlers: users ──────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (addForm.password !== addForm.confirm_password) { setAddError('Passwords do not match'); return }
    if (addForm.password.length < 8) { setAddError('Password must be at least 8 characters'); return }
    setAddSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addForm.username, display_name: addForm.display_name, role: addForm.role, password: addForm.password }),
      })
      const json = await res.json()
      if (!res.ok) { setAddError(json.error ?? 'Failed to create user'); return }
      setUsers(prev => [...prev, json.data]); setShowAdd(false); setAddForm(EMPTY_ADD)
    } catch { setAddError('Network error — please try again') }
    finally { setAddSaving(false) }
  }

  async function handleResetUserPw(e: React.FormEvent) {
    e.preventDefault()
    setResetUErr(null); setResetUSuccess(false)
    if (!resetTarget) return
    if (resetPw !== resetConfirm) { setResetUErr('Passwords do not match'); return }
    if (resetPw.length < 8) { setResetUErr('Password must be at least 8 characters'); return }
    setResetUSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: resetPw }),
      })
      const json = await res.json()
      if (!res.ok) { setResetUErr(json.error ?? 'Failed to reset password'); return }
      setResetUSuccess(true); setResetPw(''); setResetConfirm('')
    } catch { setResetUErr('Network error — please try again') }
    finally { setResetUSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) { setUsers(prev => prev.filter(u => u.id !== deleteTarget.id)); setDeleteTarget(null) }
    } finally { setDeleteSaving(false) }
  }

  // ── Handlers: table reset ────────────────────────────────────────────────
  async function resetTable(table: string) {
    if (!confirm(`Clear all data from "${table}"? This cannot be undone.`)) return
    setResetStatus(s => ({ ...s, [table]: 'loading' }))
    const res  = await fetch('/api/admin/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table }),
    })
    const data = await res.json()
    const msg  = data.results?.[table] ?? data.error ?? 'unknown'
    setResetStatus(s => ({ ...s, [table]: msg === 'cleared' ? 'done' : 'error' }))
    setResetLog(l => ({ ...l, [table]: msg }))
    setTimeout(() => setResetStatus(s => ({ ...s, [table]: 'idle' })), 3000)
  }

  async function resetAll() {
    if (!confirm('⚠️ This will DELETE ALL data from every table. Are you absolutely sure?')) return
    setConfirmAll(false)
    setResetStatus(Object.fromEntries(TABLES.map(t => [t.key, 'loading'])))
    const res  = await fetch('/api/admin/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'ALL' }),
    })
    const data = await res.json()
    const next: Record<string, ResetStatus> = {}
    const logs: Record<string, string> = {}
    for (const t of TABLES) {
      const msg = data.results?.[t.key] ?? 'unknown'
      next[t.key] = msg === 'cleared' ? 'done' : 'error'
      logs[t.key] = msg
    }
    setResetStatus(next); setResetLog(logs)
    setTimeout(() => setResetStatus({}), 4000)
  }

  // ── Handlers: export / import ────────────────────────────────────────────
  function exportTable(table: string) {
    const a = document.createElement('a')
    a.href = `/api/admin/export?table=${table}`
    a.click()
  }

  async function importExcel() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setImportStatus('loading'); setImportLog([])
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/admin/import-excel', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setImportStatus('error'); setImportLog([data.error ?? 'Import failed']); return }
    setImportStatus('done'); setImportLog(data.log ?? [])
  }

  // ── Shared UI ─────────────────────────────────────────────────────────────
  function StatusIcon({ s }: { s: ResetStatus }) {
    if (s === 'loading') return <Loader2      size={13} className="animate-spin text-blue-500" />
    if (s === 'done')    return <CheckCircle  size={13} className="text-green-600" />
    if (s === 'error')   return <AlertTriangle size={13} className="text-red-500" />
    return null
  }

  const navItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter(n => n.id === 'password')

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="Admin Settings" subtitle="Account, users and data management" />

      <div className="flex gap-6 items-start">

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── Update Password ─────────────────────────────────────────── */}
          <section id="password" className="scroll-mt-6 bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Update Password</h2>
            </div>

            <form onSubmit={changePassword} className="max-w-sm space-y-4">
              {(['current', 'next', 'confirm'] as const).map(field => {
                const labels = { current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password' }
                const placeholders = { current: 'Your current password', next: 'At least 8 characters', confirm: 'Repeat new password' }
                const mismatch = field === 'confirm' && pwForm.confirm && pwForm.confirm !== pwForm.next
                return (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{labels[field]}</label>
                    <div className="relative">
                      <input
                        type={show[field] ? 'text' : 'password'}
                        value={pwForm[field]}
                        onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                        required placeholder={placeholders[field]}
                        className={`w-full border rounded-lg px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 ${mismatch ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                        {show[field] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {field === 'next' && pw && (
                      <div className="mt-1.5 space-y-0.5">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pw.bar} ${pw.width}`} />
                        </div>
                        <p className={`text-xs ${pw.color}`}>{pw.label}</p>
                      </div>
                    )}
                    {mismatch && <p className="text-xs text-red-500 mt-0.5">Passwords do not match</p>}
                  </div>
                )
              })}

              {pwError   && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{pwError}</div>}
              {pwSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle2 size={15} /> Password updated successfully.
                </div>
              )}
              <button type="submit" disabled={pwSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                {pwSaving ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          </section>

          {isAdmin && <>

            {/* ── User Management ───────────────────────────────────────── */}
            <section id="users" className="scroll-mt-6 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserCog size={16} className="text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-700">User Management</h2>
                  <span className="text-xs text-slate-400">({users.length})</span>
                </div>
                <button
                  onClick={() => { setShowAdd(true); setAddError(null); setAddForm(EMPTY_ADD) }}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Add User
                </button>
              </div>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Search name, username, role…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Name</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Username</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Role</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Created</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0
                      ? <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No users found.</td></tr>
                      : null}
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 text-sm">
                          <div className="flex items-center gap-1.5">
                            {u.display_name}
                            {u.id === currentUserId && (
                              <span className="text-[10px] bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{u.username}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setResetTarget(u); setResetPw(''); setResetConfirm(''); setResetUErr(null); setResetUSuccess(false) }}
                              title="Reset password"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <KeyRound size={14} />
                            </button>
                            {u.id !== currentUserId && (
                              <button onClick={() => setDeleteTarget(u)} title="Delete user"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">
                          {u.display_name}
                          {u.id === currentUserId && (
                            <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded">You</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{u.username}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => { setResetTarget(u); setResetPw(''); setResetConfirm(''); setResetUErr(null); setResetUSuccess(false) }}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium"
                      >
                        <KeyRound size={12} /> Reset Password
                      </button>
                      {u.id !== currentUserId && (
                        <button onClick={() => setDeleteTarget(u)}
                          className="flex items-center gap-1 text-xs text-red-500 font-medium ml-auto">
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Import Data ───────────────────────────────────────────── */}
            <section id="import" className="scroll-mt-6 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Import Data</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Upload <span className="font-medium text-slate-600">Easy Life – Management Board.xlsx</span>.
                Data is appended — run a reset first if you want a clean import.
              </p>

              <div className="flex items-center gap-3 flex-wrap mb-4">
                <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg cursor-pointer text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  <FileSpreadsheet size={15} />
                  <span className="truncate max-w-[220px]">{fileName || 'Choose .xlsx file'}</span>
                  <input
                    ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => { setFileName(e.target.files?.[0]?.name ?? ''); setImportStatus('idle') }}
                  />
                </label>
                <button
                  onClick={importExcel}
                  disabled={importStatus === 'loading' || !fileName}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {importStatus === 'loading'
                    ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                    : <><Upload size={14} /> Import Data</>}
                </button>
              </div>

              {importLog.length > 0 && (
                <div className={`rounded-lg border p-4 ${importStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Import Log</p>
                  <div className="space-y-1">
                    {importLog.map((line, i) => (
                      <p key={i} className={`text-xs font-mono ${line.includes('✗') || line.includes('ERROR') ? 'text-red-600' : 'text-slate-700'}`}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Export Data ───────────────────────────────────────────── */}
            <section id="export" className="scroll-mt-6 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Download size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Export Data</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">Download any table or all tables as an Excel workbook.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
                {TABLES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => exportTable(t.key)}
                    className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors group text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.label}</p>
                      <p className="text-xs text-slate-400 truncate">{t.desc}</p>
                    </div>
                    <Download size={13} className="shrink-0 text-slate-400 group-hover:text-blue-600 ml-2 transition-colors" />
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => exportTable('ALL')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download size={13} /> Export All Tables
                </button>
              </div>
            </section>

            {/* ── Reset Data ────────────────────────────────────────────── */}
            <section id="reset" className="scroll-mt-6 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Database size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Reset Data</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">Permanently deletes all rows from a table. Cannot be undone.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
                {TABLES.map(t => (
                  <div key={t.key} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.label}</p>
                      <p className="text-xs text-slate-400 truncate">{t.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusIcon s={resetStatus[t.key] ?? 'idle'} />
                      <button
                        onClick={() => resetTable(t.key)}
                        disabled={resetStatus[t.key] === 'loading'}
                        title={`Clear ${t.label}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none ml-auto">
                  <input type="checkbox" checked={confirmAll} onChange={e => setConfirmAll(e.target.checked)} className="w-4 h-4 accent-red-600" />
                  I understand this will erase all data permanently
                </label>
                <button
                  onClick={resetAll}
                  disabled={!confirmAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw size={13} /> Reset All Tables
                </button>
              </div>
            </section>

          </>}
        </div>

        {/* ── Right sticky nav ────────────────────────────────────────────── */}
        <div className="hidden xl:block w-48 shrink-0 sticky top-8">
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-2 pb-2 mb-1 border-b border-slate-100">
              On this page
            </p>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  activeSection === id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input value={addForm.display_name} onChange={e => setAddForm(f => ({ ...f, display_name: e.target.value }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Lorenzo Pagnan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. lorenzo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input type="password" value={addForm.confirm_password} onChange={e => setAddForm(f => ({ ...f, confirm_password: e.target.value }))} required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${addForm.confirm_password && addForm.confirm_password !== addForm.password ? 'border-red-400' : 'border-slate-300'}`}
                  placeholder="Repeat password" />
              </div>
            </div>
            {addError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button type="submit" disabled={addSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
                {addSaving ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetTarget && (
        <Modal title={`Reset Password — ${resetTarget.display_name}`} onClose={() => setResetTarget(null)}>
          {resetUSuccess ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <ShieldCheck size={16} />
                Password for <strong>{resetTarget.display_name}</strong> has been reset.
              </div>
              <div className="flex justify-end">
                <button onClick={() => setResetTarget(null)} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg">Done</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetUserPw} className="space-y-4">
              <p className="text-sm text-slate-600">Set a new password for <strong>{resetTarget.display_name}</strong> ({resetTarget.username}).</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${resetConfirm && resetConfirm !== resetPw ? 'border-red-400' : 'border-slate-300'}`}
                  placeholder="Repeat new password" />
              </div>
              {resetUErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{resetUErr}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setResetTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={resetUSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
                  {resetUSaving ? 'Saving…' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong>{deleteTarget.display_name}</strong> ({deleteTarget.username})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleDelete} disabled={deleteSaving}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
                {deleteSaving ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
