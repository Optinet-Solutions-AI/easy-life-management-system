'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Check, X, Plus, Trash2, Upload, Loader2,
  Flame, AlertTriangle, CalendarDays, User, BedDouble, PackageOpen,
  ImagePlus, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/context/PermissionsContext'
import Modal from '@/components/Modal'

type Room = { id: string; number: number; name: string; active: boolean }

type RoomPhoto = { id: string; room_id: string; url: string; position: number }

type InventoryItem = {
  id: string
  room_id: string
  name: string
  category: string
  quantity: number
  notes: string | null
}

type FireExtinguisher = {
  id: string
  room_id: string
  location: string
  serial_number: string | null
  expiry_date: string
  last_inspected: string | null
  notes: string | null
}

type GuestRow = {
  id: string
  guest_name: string
  room: number
  check_in: string
  check_out: string
  amount_thb_stay: number | null
  payment: number | null
  paid: string | null
}

interface Props {
  room: Room
  initialPhotos: RoomPhoto[]
  initialInventory: InventoryItem[]
  initialExtinguishers: FireExtinguisher[]
  currentGuest: GuestRow | null
  upcomingGuests: GuestRow[]
}

const INVENTORY_CATEGORIES = [
  'Furniture', 'Electronics', 'Bedding & Linen', 'Bathroom',
  'Kitchen', 'Minibar', 'Safety', 'Decoration', 'Other',
]

const EMPTY_INV: Omit<InventoryItem, 'id' | 'room_id'> = {
  name: '', category: 'Furniture', quantity: 1, notes: null,
}

const EMPTY_EXT: Omit<FireExtinguisher, 'id' | 'room_id'> = {
  location: 'Room', serial_number: null, expiry_date: '', last_inspected: null, notes: null,
}

function expiryStatus(dateStr: string) {
  const today = new Date()
  const exp   = new Date(dateStr)
  const days  = Math.ceil((exp.getTime() - today.getTime()) / 86400000)
  if (days < 0)  return { label: 'Expired',            color: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500',    days }
  if (days <= 7)  return { label: `${days}d left`,       color: 'bg-red-50 text-red-600 border-red-200',        dot: 'bg-red-400',    days }
  if (days <= 30) return { label: `${days}d left`,       color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400',  days }
  return            { label: `${days}d left`,            color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500',  days }
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RoomDetailClient({
  room: initialRoom,
  initialPhotos,
  initialInventory,
  initialExtinguishers,
  currentGuest,
  upcomingGuests,
}: Props) {
  const router  = useRouter()
  const { can } = usePermissions()
  const canEdit   = can('rooms', 'edit')
  const canAdd    = can('rooms', 'add')
  const canDelete = can('rooms', 'delete')

  const [room, setRoom]         = useState<Room>(initialRoom)
  const [photos, setPhotos]     = useState<RoomPhoto[]>(initialPhotos)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>(initialExtinguishers)

  // Room name edit
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue]     = useState(room.name)
  const [nameSaving, setNameSaving]   = useState(false)

  // Photo upload
  const photoRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox]   = useState<number | null>(null)

  // Inventory modal
  const [invModal, setInvModal]   = useState(false)
  const [invForm, setInvForm]     = useState<Omit<InventoryItem, 'id' | 'room_id'>>(EMPTY_INV)
  const [invEditing, setInvEditing] = useState<string | null>(null)
  const [invSaving, setInvSaving] = useState(false)

  // Fire extinguisher modal
  const [extModal, setExtModal]   = useState(false)
  const [extForm, setExtForm]     = useState<Omit<FireExtinguisher, 'id' | 'room_id'>>(EMPTY_EXT)
  const [extEditing, setExtEditing] = useState<string | null>(null)
  const [extSaving, setExtSaving] = useState(false)

  // ── Room name ──────────────────────────────────────────────────────────────
  async function saveName() {
    const name = nameValue.trim()
    if (!name || name === room.name) { setEditingName(false); return }
    setNameSaving(true)
    await fetch('/api/admin/rooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: room.id, name }),
    })
    setRoom(r => ({ ...r, name }))
    setEditingName(false)
    setNameSaving(false)
  }

  // ── Photos ─────────────────────────────────────────────────────────────────
  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (photos.length >= 5) { alert('Maximum 5 photos per room.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json() as { ok: boolean; url?: string; error?: string }
      if (!json.ok) throw new Error(json.error ?? 'Upload failed')

      const position = photos.length
      const { data, error } = await supabase
        .from('room_photos')
        .insert({ room_id: room.id, url: json.url!, position })
        .select()
        .single()
      if (error) throw error
      setPhotos(prev => [...prev, data])
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm('Remove this photo?')) return
    await supabase.from('room_photos').delete().eq('id', id)
    setPhotos(prev => prev.filter(p => p.id !== id))
    if (lightbox !== null) setLightbox(null)
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  function openInvAdd() {
    setInvEditing(null)
    setInvForm(EMPTY_INV)
    setInvModal(true)
  }

  function openInvEdit(item: InventoryItem) {
    setInvEditing(item.id)
    setInvForm({ name: item.name, category: item.category, quantity: item.quantity, notes: item.notes })
    setInvModal(true)
  }

  async function saveInv() {
    if (!invForm.name.trim()) return
    setInvSaving(true)
    try {
      if (invEditing) {
        const { data, error } = await supabase
          .from('room_inventory')
          .update({ ...invForm, updated_at: new Date().toISOString() })
          .eq('id', invEditing)
          .select()
          .single()
        if (error) throw error
        setInventory(prev => prev.map(i => i.id === invEditing ? data : i))
      } else {
        const { data, error } = await supabase
          .from('room_inventory')
          .insert({ ...invForm, room_id: room.id })
          .select()
          .single()
        if (error) throw error
        setInventory(prev => [...prev, data])
      }
      setInvModal(false)
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setInvSaving(false)
    }
  }

  async function deleteInv(id: string) {
    if (!confirm('Delete this inventory item?')) return
    await supabase.from('room_inventory').delete().eq('id', id)
    setInventory(prev => prev.filter(i => i.id !== id))
  }

  // ── Fire Extinguishers ─────────────────────────────────────────────────────
  function openExtAdd() {
    setExtEditing(null)
    setExtForm(EMPTY_EXT)
    setExtModal(true)
  }

  function openExtEdit(ext: FireExtinguisher) {
    setExtEditing(ext.id)
    setExtForm({
      location: ext.location,
      serial_number: ext.serial_number,
      expiry_date: ext.expiry_date,
      last_inspected: ext.last_inspected,
      notes: ext.notes,
    })
    setExtModal(true)
  }

  async function saveExt() {
    if (!extForm.expiry_date) return
    setExtSaving(true)
    try {
      if (extEditing) {
        const { data, error } = await supabase
          .from('room_fire_extinguishers')
          .update({ ...extForm, updated_at: new Date().toISOString() })
          .eq('id', extEditing)
          .select()
          .single()
        if (error) throw error
        setExtinguishers(prev => prev.map(e => e.id === extEditing ? data : e).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)))
      } else {
        const { data, error } = await supabase
          .from('room_fire_extinguishers')
          .insert({ ...extForm, room_id: room.id })
          .select()
          .single()
        if (error) throw error
        setExtinguishers(prev => [...prev, data].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)))
      }
      setExtModal(false)
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setExtSaving(false)
    }
  }

  async function deleteExt(id: string) {
    if (!confirm('Delete this fire extinguisher record?')) return
    await supabase.from('room_fire_extinguishers').delete().eq('id', id)
    setExtinguishers(prev => prev.filter(e => e.id !== id))
  }

  // ── Inventory grouped by category ─────────────────────────────────────────
  const invByCategory = INVENTORY_CATEGORIES
    .map(cat => ({ cat, items: inventory.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0)

  const expiringCount = extinguishers.filter(e => {
    const days = Math.ceil((new Date(e.expiry_date).getTime() - Date.now()) / 86400000)
    return days <= 30
  }).length

  const sortedPhotos = [...photos].sort((a, b) => a.position - b.position)

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/rooms')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={15} /> All Rooms
        </button>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Room {room.number}</p>
            {editingName ? (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  autoFocus
                  className="text-2xl font-bold text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') { setEditingName(false); setNameValue(room.name) }
                  }}
                />
                <button onClick={saveName} disabled={nameSaving} className="text-green-600 hover:text-green-700">
                  <Check size={18} />
                </button>
                <button onClick={() => { setEditingName(false); setNameValue(room.name) }} className="text-slate-400">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-2xl font-bold text-slate-900">{room.name}</h1>
                {canEdit && (
                  <button onClick={() => setEditingName(true)} className="text-slate-300 hover:text-blue-500 transition-colors">
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Occupancy badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
            currentGuest
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <BedDouble size={16} />
            {currentGuest ? `Occupied — ${currentGuest.guest_name}` : 'Available'}
          </div>
        </div>
      </div>

      <div className="space-y-8">

        {/* ── Photos ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Photos ({photos.length}/5)
            </h2>
            {canEdit && photos.length < 5 && (
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploading ? 'Uploading…' : 'Add Photo'}
              </button>
            )}
            <input
              ref={photoRef}
              type="file"
              accept="image/*,application/pdf,.heic,.heif"
              className="hidden"
              onChange={uploadPhoto}
            />
          </div>

          {sortedPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {sortedPhotos.map((photo, idx) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`${room.name} photo ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightbox(idx)}
                  />
                  {canDelete && (
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => canEdit && photoRef.current?.click()}
              className={`flex flex-col items-center justify-center h-36 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm gap-2 ${canEdit ? 'cursor-pointer hover:border-blue-300 hover:text-blue-500 transition-colors' : ''}`}
            >
              <ImagePlus size={24} className="opacity-40" />
              {canEdit ? 'Click to add photos' : 'No photos yet'}
            </div>
          )}
        </section>

        {/* ── Current Guest & Upcoming ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Occupancy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Current */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className={`px-4 py-2.5 border-b text-xs font-semibold uppercase tracking-wide ${
                currentGuest ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                Currently In-House
              </div>
              {currentGuest ? (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-slate-400" />
                    <p className="text-sm font-semibold text-slate-800">{currentGuest.guest_name}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {fmt(currentGuest.check_in)} → {fmt(currentGuest.check_out)}
                  </p>
                  {currentGuest.amount_thb_stay != null && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Stay: ฿{currentGuest.amount_thb_stay.toLocaleString()}
                      {(currentGuest.payment ?? 0) > 0 && ` · Paid: ฿${(currentGuest.payment ?? 0).toLocaleString()}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-slate-400">No current guest</p>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 text-xs font-semibold uppercase tracking-wide text-blue-600">
                Upcoming ({upcomingGuests.length})
              </div>
              {upcomingGuests.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {upcomingGuests.map(g => (
                    <div key={g.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{g.guest_name}</p>
                        <p className="text-xs text-slate-400">{fmt(g.check_in)} → {fmt(g.check_out)}</p>
                      </div>
                      <CalendarDays size={14} className="text-slate-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-slate-400">No upcoming bookings</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Inventory ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inventory ({inventory.length} items)
            </h2>
            {canAdd && (
              <button
                onClick={openInvAdd}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} /> Add Item
              </button>
            )}
          </div>

          {invByCategory.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {invByCategory.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</p>
                  </div>
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{item.name}</p>
                        {item.notes && <p className="text-xs text-slate-400 truncate">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-sm font-semibold text-slate-600 w-8 text-right">×{item.quantity}</span>
                        {canEdit && (
                          <button onClick={() => openInvEdit(item)} className="text-slate-300 hover:text-blue-500 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteInv(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm gap-1.5">
              <PackageOpen size={20} className="opacity-40" />
              No inventory items yet
            </div>
          )}
        </section>

        {/* ── Fire Safety ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Fire Extinguishers
              </h2>
              {expiringCount > 0 && (
                <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <AlertTriangle size={11} /> {expiringCount} expiring soon
                </span>
              )}
            </div>
            {canAdd && (
              <button
                onClick={openExtAdd}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} /> Add
              </button>
            )}
          </div>

          {extinguishers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {extinguishers.map(ext => {
                const status = expiryStatus(ext.expiry_date)
                return (
                  <div key={ext.id} className={`rounded-xl border p-4 ${status.color}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Flame size={16} className="shrink-0" />
                        <p className="text-sm font-semibold">{ext.location}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button onClick={() => openExtEdit(ext)} className="opacity-60 hover:opacity-100 transition-opacity p-0.5">
                            <Pencil size={12} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteExt(ext.id)} className="opacity-60 hover:opacity-100 transition-opacity p-0.5">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs">Expiry: <span className="font-semibold">{fmt(ext.expiry_date)}</span></p>
                      <p className="text-xs font-semibold">{status.label}</p>
                      {ext.serial_number && <p className="text-xs opacity-70">S/N: {ext.serial_number}</p>}
                      {ext.last_inspected && <p className="text-xs opacity-70">Last inspected: {fmt(ext.last_inspected)}</p>}
                      {ext.notes && <p className="text-xs opacity-70">{ext.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm gap-1.5">
              <Flame size={20} className="opacity-40" />
              No fire extinguisher records
            </div>
          )}
        </section>
      </div>

      {/* ── Lightbox ── */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X size={28} />
          </button>
          {lightbox > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white"
              onClick={e => { e.stopPropagation(); setLightbox(l => (l ?? 0) - 1) }}
            >
              <ChevronLeft size={36} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sortedPhotos[lightbox]?.url}
            alt=""
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
          {lightbox < sortedPhotos.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white"
              onClick={e => { e.stopPropagation(); setLightbox(l => (l ?? 0) + 1) }}
            >
              <ChevronRight size={36} />
            </button>
          )}
          <p className="absolute bottom-4 text-white/50 text-sm">{lightbox + 1} / {sortedPhotos.length}</p>
        </div>
      )}

      {/* ── Inventory Modal ── */}
      {invModal && (
        <Modal title={invEditing ? 'Edit Item' : 'Add Inventory Item'} onClose={() => setInvModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Item Name *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={invForm.name}
                onChange={e => setInvForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Air conditioner"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={invForm.category}
                  onChange={e => setInvForm(f => ({ ...f, category: e.target.value }))}
                >
                  {INVENTORY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={invForm.quantity}
                  onChange={e => setInvForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={invForm.notes ?? ''}
                onChange={e => setInvForm(f => ({ ...f, notes: e.target.value || null }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setInvModal(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button
              onClick={saveInv}
              disabled={invSaving || !invForm.name.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {invSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Fire Extinguisher Modal ── */}
      {extModal && (
        <Modal title={extEditing ? 'Edit Fire Extinguisher' : 'Add Fire Extinguisher'} onClose={() => setExtModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={extForm.location}
                onChange={e => setExtForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Near entrance, Bathroom"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={extForm.expiry_date}
                  onChange={e => setExtForm(f => ({ ...f, expiry_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Last Inspected</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={extForm.last_inspected ?? ''}
                  onChange={e => setExtForm(f => ({ ...f, last_inspected: e.target.value || null }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Serial Number</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={extForm.serial_number ?? ''}
                onChange={e => setExtForm(f => ({ ...f, serial_number: e.target.value || null }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={extForm.notes ?? ''}
                onChange={e => setExtForm(f => ({ ...f, notes: e.target.value || null }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setExtModal(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button
              onClick={saveExt}
              disabled={extSaving || !extForm.expiry_date}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {extSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
