'use client'

import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Paperclip, Upload, X, FileText, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, SHAREHOLDERS } from '@/types'
import type { ShareholderMeeting, MeetingAttachment } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { usePermissions } from '@/context/PermissionsContext'

const EMPTY: Partial<ShareholderMeeting> = {
  meeting_date: '', title: '', participants: [], agenda: '', decisions: '', action_items: '', attachments: [],
}

export default function ShareholderMeetingsClient({ initialMeetings }: { initialMeetings: ShareholderMeeting[] }) {
  const { can } = usePermissions()
  const canAdd    = can('shareholder_meetings', 'add')
  const canEdit   = can('shareholder_meetings', 'edit')
  const canDelete = can('shareholder_meetings', 'delete')
  const [meetings, setMeetings] = useState<ShareholderMeeting[]>(initialMeetings)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ShareholderMeeting | null>(null)
  const [form, setForm] = useState<Partial<ShareholderMeeting>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = meetings.slice(0, page * PAGE_SIZE)

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, participants: [], attachments: [] }); setOpen(true) }
  const openEdit = (m: ShareholderMeeting) => { setEditing(m); setForm({ ...m, participants: [...m.participants], attachments: [...m.attachments] }); setOpen(true) }

  function toggleParticipant(name: string) {
    setForm(f => {
      const current = f.participants ?? []
      return {
        ...f,
        participants: current.includes(name) ? current.filter(n => n !== name) : [...current, name],
      }
    })
  }

  async function uploadAttachment(file: File): Promise<MeetingAttachment | null> {
    setUploading(true)
    const path = `meetings/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('dms-files').upload(path, file, { upsert: false })
    setUploading(false)
    if (error || !data) { alert('Upload failed: ' + error?.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('dms-files').getPublicUrl(data.path)
    return { name: file.name, url: publicUrl }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const attachment = await uploadAttachment(file)
    if (attachment) setForm(f => ({ ...f, attachments: [...(f.attachments ?? []), attachment] }))
    e.target.value = ''
  }

  function removeAttachment(idx: number) {
    setForm(f => ({ ...f, attachments: (f.attachments ?? []).filter((_, i) => i !== idx) }))
  }

  async function save() {
    if (!form.meeting_date || !form.title?.trim()) return alert('Date and title are required.')
    setSaving(true)
    const payload = {
      meeting_date: form.meeting_date,
      title: form.title,
      participants: form.participants ?? [],
      agenda: form.agenda || null,
      decisions: form.decisions || null,
      action_items: form.action_items || null,
      attachments: form.attachments ?? [],
    }
    if (editing) {
      const { data } = await supabase.from('shareholder_meetings').update(payload).eq('id', editing.id).select().single()
      if (data) setMeetings(prev => prev.map(m => m.id === editing.id ? data : m))
    } else {
      const { data } = await supabase.from('shareholder_meetings').insert(payload).select().single()
      if (data) setMeetings(prev => [data, ...prev])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('shareholder_meetings').delete().eq('id', id)
    setMeetings(prev => prev.filter(m => m.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Shareholder Meetings"
        subtitle={`${meetings.length} meetings recorded`}
        action={canAdd ? (
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Meeting
          </button>
        ) : undefined}
      />

      <div className="space-y-3">
        {visible.map(m => {
          const isExpanded = expanded === m.id
          return (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
              {/* Header row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : m.id)}
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{m.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-sm text-slate-500">{formatDate(m.meeting_date)}</span>
                    {m.participants.length > 0 && (
                      <span className="text-xs text-slate-400">{m.participants.length} participants</span>
                    )}
                    {m.attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Paperclip size={11} />{m.attachments.length} file{m.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit   && <button onClick={e => { e.stopPropagation(); openEdit(m) }} className="text-slate-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>}
                  {canDelete && <button onClick={e => { e.stopPropagation(); remove(m.id) }} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>}
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">
                  {m.participants.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Participants</p>
                      <div className="flex flex-wrap gap-2">
                        {m.participants.map(p => (
                          <span key={p} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.agenda && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Agenda</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{m.agenda}</p>
                    </div>
                  )}
                  {m.decisions && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Decisions</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{m.decisions}</p>
                    </div>
                  )}
                  {m.action_items && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Action Items</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{m.action_items}</p>
                    </div>
                  )}
                  {m.attachments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {m.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-blue-400 hover:text-blue-600 transition-colors">
                            <FileText size={13} />{a.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {meetings.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>No meetings recorded yet.</p>
            <button onClick={openNew} className="mt-3 text-sm text-blue-600 hover:underline">Record first meeting</button>
          </div>
        )}

        {visible.length < meetings.length && (
          <div className="text-center mt-2">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              Load more ({meetings.length - visible.length} remaining)
            </button>
          </div>
        )}
      </div>

      {open && (
        <Modal title={editing ? 'Edit Meeting' : 'Add Meeting'} onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Date *</label><input type="date" className="input" value={form.meeting_date ?? ''} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} /></div>
              <div><label className="label">Meeting Title *</label><input className="input" placeholder="e.g. Q1 Review" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            </div>

            {/* Participants */}
            <div>
              <label className="label">Participants</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SHAREHOLDERS.map(s => {
                  const selected = (form.participants ?? []).includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleParticipant(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {s.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div><label className="label">Agenda</label><textarea className="input" rows={3} placeholder="Meeting agenda items…" value={form.agenda ?? ''} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} /></div>
            <div><label className="label">Decisions Made</label><textarea className="input" rows={3} placeholder="Key decisions reached…" value={form.decisions ?? ''} onChange={e => setForm(f => ({ ...f, decisions: e.target.value }))} /></div>
            <div><label className="label">Action Items</label><textarea className="input" rows={3} placeholder="Follow-up tasks and responsibilities…" value={form.action_items ?? ''} onChange={e => setForm(f => ({ ...f, action_items: e.target.value }))} /></div>

            {/* Attachments */}
            <div>
              <label className="label">Attachments</label>
              <div className="space-y-2 mt-1">
                {(form.attachments ?? []).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <FileText size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-700 flex-1 truncate">{a.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-red-600"><X size={13} /></button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 text-xs text-slate-600 border border-dashed border-slate-300 rounded-lg px-4 py-2.5 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50 w-full justify-center"
                >
                  <Upload size={13} />{uploading ? 'Uploading…' : 'Upload file (PDF, DOC, image)'}
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
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
