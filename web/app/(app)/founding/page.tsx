import { supabase } from '@/lib/supabase'
import type { FoundingContribution } from '@/types'
import FoundingClient from './FoundingClient'

export default async function FoundingPage() {
  const { data } = await supabase
    .from('founding_contributions')
    .select('*')
    .order('date', { ascending: true })
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <FoundingClient initialContributions={(data ?? []) as FoundingContribution[]} />
    </div>
  )
}
