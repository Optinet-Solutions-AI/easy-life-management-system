import { supabase } from '@/lib/supabase'
import type { Expense } from '@/types'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .order('payment_date', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ExpensesClient initialExpenses={(data ?? []) as Expense[]} />
    </div>
  )
}
