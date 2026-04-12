import { supabase } from '@/lib/supabase'
import ComplaintsClient from './ComplaintsClient'

export default async function ComplaintsPage() {
  const { data } = await supabase
    .from('complaints')
    .select('*')
    .order('date', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ComplaintsClient initialComplaints={data ?? []} />
    </div>
  )
}
