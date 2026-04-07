'use client'

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export default function ChangePasswordClient() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordStrength = (pw: string) => {
    if (pw.length === 0) return null
    if (pw.length < 8) return { label: 'Too short', color: 'text-red-500', bar: 'bg-red-400', width: 'w-1/4' }
    const score = [/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length
    if (score === 0) return { label: 'Weak', color: 'text-orange-500', bar: 'bg-orange-400', width: 'w-2/4' }
    if (score === 1) return { label: 'Good', color: 'text-yellow-600', bar: 'bg-yellow-400', width: 'w-3/4' }
    return { label: 'Strong', color: 'text-green-600', bar: 'bg-green-500', width: 'w-full' }
  }

  const strength = passwordStrength(form.new_password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match')
      return
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to change password')
      } else {
        setSuccess(true)
        setForm({ current_password: '', new_password: '', confirm_password: '' })
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <PageHeader
        title="Change Password"
        subtitle="Update your login password"
      />

      <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={form.current_password}
              onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your current password"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={form.new_password}
              onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Strength bar */}
          {strength && (
            <div className="mt-2 space-y-1">
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${strength.bar} ${strength.width}`} />
              </div>
              <p className={`text-xs ${strength.color}`}>{strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm_password}
              onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
              required
              className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                form.confirm_password && form.confirm_password !== form.new_password
                  ? 'border-red-400'
                  : 'border-slate-300'
              }`}
              placeholder="Repeat new password"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.confirm_password && form.confirm_password !== form.new_password && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Password changed successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
