import { supabase } from '@/lib/supabase'
import type { BudgetRevenue, BudgetExpense, BudgetRent } from '@/types'
import BudgetClient from './BudgetClient'

export default async function BudgetPage() {
  const [revRes, expRes, rentRes] = await Promise.all([
    supabase.from('budget_revenue').select('*').order('year').order('month'),
    supabase.from('budget_expenses').select('*').order('year').order('month'),
    supabase.from('budget_rent').select('*').order('year_number'),
  ])
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BudgetClient
        initialRevenue={(revRes.data ?? []) as BudgetRevenue[]}
        initialExpenses={(expRes.data ?? []) as BudgetExpense[]}
        initialRent={(rentRes.data ?? []) as BudgetRent[]}
      />
    </div>
  )
}
