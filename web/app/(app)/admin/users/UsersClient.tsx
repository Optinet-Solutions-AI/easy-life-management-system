'use client'

import { useState } from 'react'
import { UserCog, Plus, KeyRound, Trash2, ShieldCheck } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

const ROLES = ['admin', 'shareholder', 'gm', 'lawyer', 'accountant', 'staff']
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  shareholder: 'Shareholder',
  gm: 'General Manager',
  lawyer: 'Lawyer',
  accountant: 'Accountant',
  staff: 'Staff',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  shareholder: 'bg-blue-100 text-blue-700',
  gm: 'bg-teal-100 text-teal-700',
  lawyer: 'bg-amber-100 text-amber-700',
  accountant: 'bg-orange-100 text-orange-700',
  staff: 'bg-slate-100 text-slate-600',
}

interface User {
  id: string
  username: string
  display_name: string
  role: string
  created_at: string
}

interface AddForm {
  username: string
  display_name: string
  role: string
  password: string
  confirm_password: string
}

const EMPTY_ADD: AddForm = { username: '', display_name: '', role: 'staff', password: '', confirm_password: '' }

export default function UsersClient({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSaving, setResetSaving] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  // ── Add User ────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (addForm.password !== addForm.confirm_password) { setAddError('Passwords do not match'); return }
    if (addForm.password.length < 8) { setAddError('Password must be at least 8 characters'); return }

    setAddSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addForm.username,
          display_name: addForm.display_name,
          role: addForm.role,
          password: addForm.password,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setAddError(json.error ?? 'Failed to create user'); return }
      setUsers(prev => [...prev, json.data])
      setShowAdd(false)
      setAddForm(EMPTY_ADD)
    } catch {
      setAddError('Network error — please try again')
    } finally {
      setAddSaving(false)
    }
  }

  // ── Reset Password ───────────────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    setResetSuccess(false)
    if (!resetTarget) return
    if (resetPw !== resetConfirm) { setResetError('Passwords do not match'); return }
    if (resetPw.length < 8) { setResetError('Password must be at least 8 characters'); return }

    setResetSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: resetPw }),
      })
      const json = await res.json()
      if (!res.ok) { setResetError(json.error ?? 'Failed to reset password'); return }
      setResetSuccess(true)
      setResetPw('')
      setResetConfirm('')
    } catch {
      setResetError('Network error — please try again')
    } finally {
      setResetSaving(false)
    }
  }

  // ── Delete User ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} user${users.length !== 1 ? 's' : ''}`}
        icon={<UserCog size={22} />}
        actions={
          <button
            onClick={() => { setShowAdd(true); setAddError(null); setAddForm(EMPTY_ADD) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add User
          </button>
        }
      />

      {/* Desktop table */}
      <div className="mt-6 hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Display Name</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Username</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    {u.display_name}
                    {u.id === currentUserId && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded">You</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setResetTarget(u); setResetPw(''); setResetConfirm(''); setResetError(null); setResetSuccess(false) }}
                      title="Reset password"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <KeyRound size={15} />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => setDeleteTarget(u)}
                        title="Delete user"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={15} />
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
      <div className="mt-6 md:hidden space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
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
              <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => { setResetTarget(u); setResetPw(''); setResetConfirm(''); setResetError(null); setResetSuccess(false) }}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <KeyRound size={13} /> Reset Password
              </button>
              {u.id !== currentUserId && (
                <button
                  onClick={() => setDeleteTarget(u)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium ml-auto"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Add User Modal ─────────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input
                  value={addForm.display_name}
                  onChange={e => setAddForm(f => ({ ...f, display_name: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Lorenzo Pagnan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  value={addForm.username}
                  onChange={e => setAddForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. lorenzo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={addForm.confirm_password}
                  onChange={e => setAddForm(f => ({ ...f, confirm_password: e.target.value }))}
                  required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    addForm.confirm_password && addForm.confirm_password !== addForm.password ? 'border-red-400' : 'border-slate-300'
                  }`}
                  placeholder="Repeat password"
                />
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

      {/* ── Reset Password Modal ───────────────────────────────────────────────── */}
      {resetTarget && (
        <Modal title={`Reset Password — ${resetTarget.display_name}`} onClose={() => setResetTarget(null)}>
          {resetSuccess ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <ShieldCheck size={16} />
                Password for <strong>{resetTarget.display_name}</strong> has been reset successfully.
              </div>
              <div className="flex justify-end">
                <button onClick={() => setResetTarget(null)} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg">Done</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-slate-600">
                Set a new password for <strong>{resetTarget.display_name}</strong> ({resetTarget.username}).
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    resetConfirm && resetConfirm !== resetPw ? 'border-red-400' : 'border-slate-300'
                  }`}
                  placeholder="Repeat new password"
                />
              </div>
              {resetError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{resetError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setResetTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={resetSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
                  {resetSaving ? 'Saving…' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong>{deleteTarget.display_name}</strong> ({deleteTarget.username})?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteSaving}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
              >
                {deleteSaving ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
