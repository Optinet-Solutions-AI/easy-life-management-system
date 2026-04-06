import { supabase } from '@/lib/supabase'
import ShareholderDashClient from './ShareholderDashClient'

export default async function ShareholderDashboardPage() {
  const currentYear = new Date().getFullYear()

  const [expRes, revRes, foundRes, bankRes, budRevRes, budExpRes, guestRes, shRes] = await Promise.all([
    supabase.from('expenses').select('category, amount, payment_date'),
    supabase.from('revenue').select('amount_thb, date'),
    supabase.from('founding_contributions').select('shareholder, amount_thb, amount_eur'),
    supabase.from('bank_balances').select('*').order('recorded_date', { ascending: false }).limit(10),
    supabase.from('budget_revenue').select('*').eq('year', currentYear),
    supabase.from('budget_expenses').select('*').eq('year', currentYear),
    supabase.from('guests').select('check_in, check_out, amount_thb_stay, payment, room, guest_name'),
    supabase.from('shareholders').select('*'),
  ])

  return (
    <ShareholderDashClient
      expenses={expRes.data ?? []}
      revenues={revRes.data ?? []}
      contributions={foundRes.data ?? []}
      bankBalances={bankRes.data ?? []}
      budgetRevenue={budRevRes.data ?? []}
      budgetExpenses={budExpRes.data ?? []}
      guests={guestRes.data ?? []}
      shareholders={shRes.data ?? []}
      currentYear={currentYear}
    />
  )
}
