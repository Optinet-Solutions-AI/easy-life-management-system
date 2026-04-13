'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, X, DoorOpen, BedDouble, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/context/PermissionsContext'
import PageHeader from '@/components/PageHeader'

type Room = { id: string; number: number; name: string; active: boolean }
type RoomPhoto = { id: string; room_id: string; url: string; position: number }
type GuestStay = { room: number; check_in: string; check_out: string }

interface Props {
  initialRooms: Room[]
  initialPhotos: RoomPhoto[]
  guests: GuestStay[]
}

export default function RoomsClient({ initialRooms, initialPhotos, guests }: Props) {
  const router = useRouter()
  const { can } = usePermissions()
  const canAdd  = can('rooms', 'add')
  const canEdit = can('rooms', 'edit')

  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [photos] = useState<RoomPhoto[]>(initialPhotos)

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')

  // Add room
  const [showAdd, setShowAdd]   = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName]     = useState('')
  const [saving, setSaving]       = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  function isOccupied(roomNumber: number) {
    return guests.some(g => g.room === roomNumber && g.check_in <= today && g.check_out >= today)
  }

  function thumbFor(roomId: string) {
    return photos
      .filter(p => p.room_id === roomId)
      .sort((a, b) => a.position - b.position)[0]?.url ?? null
  }

  async function saveRename(room: Room) {
    const name = editName.trim()
    if (!name) { setEditingId(null); return }
    setSaving(true)
    await fetch('/api/admin/rooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: room.id, name }),
    })
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, name } : r))
    setEditingId(null)
    setSaving(false)
  }

  async function addRoom() {
    const num = parseInt(newNumber)
    const name = newName.trim()
    if (!num || !name) return
    setSaving(true)
    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: num, name }),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.data) setRooms(prev => [...prev, json.data].sort((a, b) => a.number - b.number))
      setShowAdd(false)
      setNewNumber('')
      setNewName('')
    } else {
      const json = await res.json()
      alert(json.error ?? 'Failed to add room')
    }
    setSaving(false)
  }

  const activeRooms   = rooms.filter(r => r.active)
  const occupiedCount = activeRooms.filter(r => isOccupied(r.number)).length

  return (
    <>
      <PageHeader
        title="Rooms"
        subtitle={`${activeRooms.length} rooms · ${occupiedCount} occupied`}
        action={canAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus size={16} /> Add Room
          </button>
        ) : undefined}
      />

      {/* Add room form */}
      {showAdd && (
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Room Number</label>
            <input
              type="number"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28 outline-none focus:border-blue-500"
              placeholder="11"
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Room Name</label>
            <input
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48 outline-none focus:border-blue-500"
              placeholder="e.g. Deluxe Suite"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <button
            onClick={addRoom}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        </div>
      )}

      {/* Room grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rooms.filter(r => r.active).map(room => {
          const thumb    = thumbFor(room.id)
          const occupied = isOccupied(room.number)
          const isEditing = editingId === room.id

          return (
            <div
              key={room.id}
              onClick={() => !isEditing && router.push(`/rooms/${room.id}`)}
              className={`bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Thumbnail */}
              <div className="relative h-36 bg-slate-100">
                {thumb ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={thumb} alt={room.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BedDouble size={36} className="text-slate-300" />
                  </div>
                )}
                {/* Occupied badge */}
                <div className={`absolute top-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  occupied ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                }`}>
                  {occupied ? <User size={10} /> : <DoorOpen size={10} />}
                  {occupied ? 'Occupied' : 'Available'}
                </div>
              </div>

              {/* Card footer */}
              <div className="px-3 py-2.5">
                {isEditing ? (
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      className="flex-1 min-w-0 border border-blue-300 rounded px-2 py-1 text-sm outline-none"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename(room)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button onClick={() => saveRename(room)} className="text-green-600 hover:text-green-700 p-0.5">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Room {room.number}</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{room.name}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={e => { e.stopPropagation(); setEditingId(room.id); setEditName(room.name) }}
                        className="shrink-0 ml-1 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {rooms.filter(r => r.active).length === 0 && (
        <div className="mt-12 text-center text-slate-400 text-sm">
          <BedDouble size={40} className="mx-auto mb-2 opacity-30" />
          No rooms yet. Add one above.
        </div>
      )}
    </>
  )
}
