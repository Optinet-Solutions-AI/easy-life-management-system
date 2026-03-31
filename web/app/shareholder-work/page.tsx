import { supabase } from '@/lib/supabase'
import type { ShareholderWork } from '@/types'
import WorkClient from './WorkClient'

export default async function ShareholderWorkPage() {
  const { data } = await supabase
    .from('shareholder_work')
    .select('*')
    .order('month', { ascending: false })
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <WorkClient initialWork={(data ?? []) as ShareholderWork[]} />
    </div>
  )
}
