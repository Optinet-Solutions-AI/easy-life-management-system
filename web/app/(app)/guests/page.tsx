import { supabase } from '@/lib/supabase'
import { formatTHB, formatDate } from '@/types'
import type { Guest } from '@/types'
import PageHeader from '@/components/PageHeader'
import GuestsClient from './GuestsClient'

export default async function GuestsPage() {
  const { data } = await supabase
    .from('guests')
    .select('*')
    .order('check_in', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <GuestsClient initialGuests={(data ?? []) as Guest[]} />
    </div>
  )
}
