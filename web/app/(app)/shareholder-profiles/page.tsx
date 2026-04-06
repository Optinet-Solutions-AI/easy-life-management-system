import { supabase } from '@/lib/supabase'
import ShareholderProfilesClient from './ShareholderProfilesClient'

export default async function ShareholderProfilesPage() {
  const { data } = await supabase
    .from('shareholder_profiles')
    .select('*')
    .order('name', { ascending: true })

  return <ShareholderProfilesClient initialProfiles={data ?? []} />
}
