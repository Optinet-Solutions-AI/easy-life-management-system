import { supabase } from '@/lib/supabase'
import type { Guest } from '@/types'
import PageHeader from '@/components/PageHeader'
import OccupancyClient from './OccupancyClient'

export default async function OccupancyPage() {
  const { data } = await supabase.from('guests').select('*')
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <OccupancyClient guests={(data ?? []) as Guest[]} />
    </div>
  )
}
