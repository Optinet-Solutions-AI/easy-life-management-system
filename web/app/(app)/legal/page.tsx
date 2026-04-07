import { supabase } from '@/lib/supabase'
import type { Expense } from '@/types'
import LegalClient from './LegalClient'

export default async function LegalPage() {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_legal', true)
    .order('payment_date', { ascending: false })

  return <LegalClient initialExpenses={(data ?? []) as Expense[]} />
}
