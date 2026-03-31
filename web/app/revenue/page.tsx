import { supabase } from '@/lib/supabase'
import type { Revenue } from '@/types'
import RevenueClient from './RevenueClient'

export default async function RevenuePage() {
  const [revenueRes, guestsRes] = await Promise.all([
    supabase.from('revenue').select('*').order('date', { ascending: false }),
    supabase.from('guests').select('check_in, check_out, amount_thb_stay, payment, guest_name'),
  ])
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <RevenueClient
        initialRevenue={(revenueRes.data ?? []) as Revenue[]}
        guestPayments={guestsRes.data ?? []}
      />
    </div>
  )
}
