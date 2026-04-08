import { supabase } from '@/lib/supabase'
import type { BudgetRevenue, BudgetExpense, BudgetRent, BudgetRoomSetup } from '@/types'
import BudgetClient from './BudgetClient'

export default async function BudgetPage() {
  const [revRes, expRes, rentRes, setupRes, actualRevRes, actualExpRes] = await Promise.all([
    supabase.from('budget_revenue').select('*').order('year').order('month'),
    supabase.from('budget_expenses').select('*').order('year').order('month'),
    supabase.from('budget_rent').select('*').order('year_number'),
    supabase.from('budget_room_setup').select('*').order('year').order('room_name'),
    supabase.from('revenue').select('amount_thb, date'),
    supabase.from('expenses').select('amount, currency, payment_date, category'),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BudgetClient
        initialRevenue={(revRes.data ?? []) as BudgetRevenue[]}
        initialExpenses={(expRes.data ?? []) as BudgetExpense[]}
        initialRent={(rentRes.data ?? []) as BudgetRent[]}
        initialRoomSetup={(setupRes.data ?? []) as BudgetRoomSetup[]}
        actualRevenue={actualRevRes.data ?? []}
        actualExpenses={actualExpRes.data ?? []}
      />
    </div>
  )
}
