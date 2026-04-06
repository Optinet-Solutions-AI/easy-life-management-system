import { supabase } from '@/lib/supabase'
import StaffHoursClient from './StaffHoursClient'

export default async function StaffHoursPage() {
  const { data } = await supabase
    .from('staff_hours')
    .select('*')
    .order('date', { ascending: false })

  return <StaffHoursClient initialHours={data ?? []} />
}
