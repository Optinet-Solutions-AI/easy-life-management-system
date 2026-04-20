import { supabase } from '@/lib/supabase'
import type { Expense, Guest } from '@/types'
import LegalClient from './LegalClient'

export default async function LegalPage() {
  const [expRes, guestRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('is_legal', true).order('payment_date', { ascending: false }),
    supabase.from('guests').select('*').eq('show_on_legal', true).order('check_in', { ascending: false }),
  ])

  return (
    <LegalClient
      initialExpenses={(expRes.data ?? []) as Expense[]}
      initialGuests={(guestRes.data ?? []) as Guest[]}
    />
  )
}
