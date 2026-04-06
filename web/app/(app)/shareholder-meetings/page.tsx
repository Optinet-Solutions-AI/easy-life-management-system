import { supabase } from '@/lib/supabase'
import ShareholderMeetingsClient from './ShareholderMeetingsClient'

export default async function ShareholderMeetingsPage() {
  const { data } = await supabase
    .from('shareholder_meetings')
    .select('*')
    .order('meeting_date', { ascending: false })

  return <ShareholderMeetingsClient initialMeetings={data ?? []} />
}
