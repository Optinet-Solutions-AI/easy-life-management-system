'use client'

import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/types'
import type { ShareholderProfile } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { usePermissions } from '@/context/PermissionsContext'

const EMPTY: Partial<ShareholderProfile> = {
  name: '', role: '', bio: '', ownership_pct: undefined, photo_url: '',
  email: '', phone: '', nationality: '', joined_date: '',
}

export default function ShareholderProfilesClient({ initialProfiles }: { initialProfiles: ShareholderProfile[] }) {
  const { can } = usePermissions()
  const canAdd    = can('shareholder_profiles', 'add')
  const canEdit   = can('shareholder_profiles', 'edit')
  const canDelete = can('shareholder_profiles', 'delete')
  const [profiles, setProfiles] = useState<ShareholderProfile[]>(initialProfiles)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ShareholderProfile | null>(null)
  const [form, setForm] = useState<Partial<ShareholderProfile>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (p: ShareholderProfile) => { setEditing(p); setForm(p); setOpen(true) }

  async function uploadPhoto(file: File): Promise<string | null> {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `profiles/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('dms-files').upload(path, file, { upsert: true })
    setUploading(false)
    if (error || !data) { alert('Upload failed: ' + error?.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('dms-files').getPublicUrl(data.path)
    return publicUrl
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadPhoto(file)
    if (url) setForm(f => ({ ...f, photo_url: url }))
  }

  async function save() {
    if (!form.name?.trim() || !form.role?.trim()) return alert('Name and role are required.')
    setSaving(true)
    const payload = {
      name: form.name,
      role: form.role,
      bio: form.bio || null,
      ownership_pct: form.ownership_pct ?? null,
      photo_url: form.photo_url || null,
      email: form.email || null,
      phone: form.phone || null,
      nationality: form.nationality || null,
      joined_date: form.joined_date || null,
    }
    if (editing) {
      const { data } = await supabase.from('shareholder_profiles').update(payload).eq('id', editing.id).select().single()
      if (data) setProfiles(prev => prev.map(p => p.id === editing.id ? data : p))
    } else {
      const { data } = await supabase.from('shareholder_profiles').insert(payload).select().single()
      if (data) setProfiles(prev => [...prev, data])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this profile?')) return
    await supabase.from('shareholder_profiles').delete().eq('id', id)
    setProfiles(prev => prev.filter(p => p.id !== id))
  }

  const totalOwnership = profiles.reduce((s, p) => s + (p.ownership_pct ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Shareholder Profiles"
        subtitle={`${profiles.length} shareholders · ${totalOwnership.toFixed(1)}% ownership recorded`}
        action={canAdd ? (
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Profile
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {profiles.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Photo */}
            <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
              )}
              {p.ownership_pct != null && (
                <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {p.ownership_pct}%
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 text-base">{p.name}</h3>
              <p className="text-sm text-blue-600 font-medium mt-0.5">{p.role}</p>
              {p.nationality && <p className="text-xs text-slate-500 mt-1">{p.nationality}</p>}
              {p.bio && <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{p.bio}</p>}
              <div className="mt-3 space-y-1">
                {p.email && <p className="text-xs text-slate-500 truncate">{p.email}</p>}
                {p.phone && <p className="text-xs text-slate-500">{p.phone}</p>}
                {p.joined_date && <p className="text-xs text-slate-400">Joined {formatDate(p.joined_date)}</p>}
              </div>
              {(canEdit || canDelete) && (
                <div className="flex gap-2 mt-4">
                  {canEdit   && <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 border border-slate-200 rounded-lg py-1.5 hover:border-blue-400 hover:text-blue-600 transition-colors"><Pencil size={12} /> Edit</button>}
                  {canDelete && <button onClick={() => remove(p.id)} className="flex items-center justify-center text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-red-300 transition-colors"><Trash2 size={12} /></button>}
                </div>
              )}
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p>No shareholder profiles yet.</p>
            <button onClick={openNew} className="mt-3 text-sm text-blue-600 hover:underline">Add the first profile</button>
          </div>
        )}
      </div>

      {open && (
        <Modal title={editing ? 'Edit Profile' : 'Add Shareholder Profile'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Photo upload */}
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-slate-400" />
                )}
              </div>
              <div>
                <label className="label">Profile Photo</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="input"
                    placeholder="Paste URL or upload below"
                    value={form.photo_url ?? ''}
                    onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 hover:border-blue-400 disabled:opacity-50"
                  >
                    <Upload size={12} />{uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
            </div>

            <div><label className="label">Full Name *</label><input className="input" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Role / Title *</label><input className="input" placeholder="e.g. Managing Director" value={form.role ?? ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
            <div><label className="label">Ownership %</label><input type="number" step="0.01" min="0" max="100" className="input" value={form.ownership_pct ?? ''} onChange={e => setForm(f => ({ ...f, ownership_pct: e.target.value ? parseFloat(e.target.value) : undefined }))} /></div>
            <div><label className="label">Nationality</label><input className="input" value={form.nationality ?? ''} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Date Joined</label><input type="date" className="input" value={form.joined_date ?? ''} onChange={e => setForm(f => ({ ...f, joined_date: e.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="label">Bio</label><textarea className="input" rows={4} value={form.bio ?? ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={save} disabled={saving || uploading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
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
