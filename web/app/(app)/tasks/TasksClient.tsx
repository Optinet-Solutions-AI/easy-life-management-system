'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, TODO_STATUSES, DEPARTMENTS, SHAREHOLDERS } from '@/types'
import type { Todo } from '@/types'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'

const EMPTY: Partial<Todo> = { project: 'DMS', department: '', topic: '', responsible_person: '', status_notes: '', target_date: '', status: 'Pending' }

const STATUS_STYLES: Record<string, string> = {
  Complete: 'bg-green-100 text-green-700',
  Ongoing: 'bg-blue-100 text-blue-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Blocked: 'bg-red-100 text-red-700',
}

export default function TasksClient({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Todo | null>(null)
  const [form, setForm] = useState<Partial<Todo>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const filtered = filter === 'all' ? todos : todos.filter(t => t.status === filter)
  const visible = filtered.slice(0, page * PAGE_SIZE)

  const counts = TODO_STATUSES.reduce((acc, s) => {
    acc[s] = todos.filter(t => t.status === s).length
    return acc
  }, {} as Record<string, number>)

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const openEdit = (t: Todo) => { setEditing(t); setForm(t); setOpen(true) }

  async function save() {
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    if (editing) {
      const { data } = await supabase.from('todos').update(payload).eq('id', editing.id).select().single()
      if (data) setTodos(prev => prev.map(t => t.id === editing.id ? data : t))
    } else {
      const { data } = await supabase.from('todos').insert(form).select().single()
      if (data) setTodos(prev => [...prev, data])
    }
    setSaving(false); setOpen(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this task?')) return
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function quickStatus(id: string, status: string) {
    const { data } = await supabase.from('todos').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (data) setTodos(prev => prev.map(t => t.id === id ? data : t))
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Project management board"
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Task
          </button>
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[['all', `All (${todos.length})`], ...TODO_STATUSES.map(s => [s, `${s} (${counts[s] ?? 0})`])].map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setFilter(val); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >{label}</button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map(t => {
          const isOverdue = t.target_date && new Date(t.target_date) < new Date() && t.status !== 'Complete'
          return (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status] ?? 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                    {t.department && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{t.department}</span>}
                    {t.project && <span className="text-xs text-slate-400">{t.project}</span>}
                  </div>
                  <p className="font-medium text-slate-900">{t.topic}</p>
                  {t.status_notes && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t.status_notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                  {t.responsible_person && <span className="text-xs text-slate-500">{t.responsible_person}</span>}
                  {t.target_date && (
                    <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                      {isOverdue ? '⚠ ' : ''}{formatDate(t.target_date)}
                    </span>
                  )}
                  {/* Quick status change */}
                  <select
                    value={t.status}
                    onChange={e => quickStatus(t.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 outline-none bg-white"
                  >
                    {TODO_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No tasks found.</div>
        )}
        {visible.length < filtered.length && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              Load more ({filtered.length - visible.length} remaining)
            </button>
          </div>
        )}
      </div>

      {open && (
        <Modal title={editing ? 'Edit Task' : 'Add Task'} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Project</label><input className="input" value={form.project ?? ''} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} /></div>
            <div><label className="label">Department</label>
              <select className="input" value={form.department ?? ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                <option value="">—</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">Topic / Task</label><input className="input" value={form.topic ?? ''} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} /></div>
            <div><label className="label">Responsible Person</label><input className="input" value={form.responsible_person ?? ''} onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))} /></div>
            <div><label className="label">Target Date</label><input type="date" className="input" value={form.target_date ?? ''} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} /></div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status ?? 'Pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {TODO_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">Status Notes</label><textarea className="input" rows={3} value={form.status_notes ?? ''} onChange={e => setForm(f => ({ ...f, status_notes: e.target.value }))} /></div>
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
