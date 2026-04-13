import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import RoomDetailClient from './RoomDetailClient'

export const dynamic = 'force-dynamic'

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [roomRes, photosRes, inventoryRes, extRes, guestsRes] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', id).single(),
    supabase.from('room_photos').select('*').eq('room_id', id).order('position'),
    supabase.from('room_inventory').select('*').eq('room_id', id).order('category').order('name'),
    supabase.from('room_fire_extinguishers').select('*').eq('room_id', id).order('expiry_date'),
    supabase.from('guests').select('id, guest_name, room, check_in, check_out, amount_thb_stay, payment, paid').order('check_in', { ascending: false }),
  ])

  if (!roomRes.data) redirect('/rooms')

  const roomNumber = roomRes.data.number
  const today = new Date().toISOString().slice(0, 10)
  const roomGuests = (guestsRes.data ?? []).filter(g => g.room === roomNumber)
  const currentGuest = roomGuests.find(g => g.check_in <= today && g.check_out >= today) ?? null
  const upcomingGuests = roomGuests
    .filter(g => g.check_in > today)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .slice(0, 5)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <RoomDetailClient
        room={roomRes.data}
        initialPhotos={photosRes.data ?? []}
        initialInventory={inventoryRes.data ?? []}
        initialExtinguishers={extRes.data ?? []}
        currentGuest={currentGuest}
        upcomingGuests={upcomingGuests}
      />
    </div>
  )
}
