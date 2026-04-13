import { supabase } from '@/lib/supabase'
import RoomsClient from './RoomsClient'

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
  const [roomsRes, photosRes, guestsRes] = await Promise.all([
    supabase.from('rooms').select('*').order('number'),
    supabase.from('room_photos').select('id, room_id, url, position').order('position'),
    supabase.from('guests').select('room, check_in, check_out'),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <RoomsClient
        initialRooms={roomsRes.data ?? []}
        initialPhotos={photosRes.data ?? []}
        guests={guestsRes.data ?? []}
      />
    </div>
  )
}
