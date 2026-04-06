import { supabase } from '@/lib/supabase'
import OperationsDashClient from './OperationsDashClient'

export default async function OperationsDashboardPage() {
  const [guestRes, todoRes, revRes, bankRes, expRes] = await Promise.all([
    supabase.from('guests').select('*').order('check_in', { ascending: true }),
    supabase.from('todos').select('*').order('target_date', { ascending: true }),
    supabase.from('revenue').select('amount_thb, date, type').order('date', { ascending: false }).limit(30),
    supabase.from('bank_balances').select('*').order('recorded_date', { ascending: false }).limit(5),
    supabase.from('expenses').select('amount, payment_date, category, supplier').order('payment_date', { ascending: false }).limit(30),
  ])

  return (
    <OperationsDashClient
      guests={guestRes.data ?? []}
      todos={todoRes.data ?? []}
      revenues={revRes.data ?? []}
      bankBalances={bankRes.data ?? []}
      expenses={expRes.data ?? []}
    />
  )
}
