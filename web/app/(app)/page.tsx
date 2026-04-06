import { supabase } from '@/lib/supabase'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const [expensesRes, revenueRes, foundingRes, bankRes, todosRes, guestsRes] = await Promise.all([
    supabase.from('expenses').select('amount'),
    supabase.from('revenue').select('amount_thb'),
    supabase.from('founding_contributions').select('amount_thb'),
    supabase.from('bank_balances').select('*').order('recorded_date', { ascending: false }).limit(5),
    supabase.from('todos').select('status'),
    supabase.from('guests').select('id, check_in, check_out, room, guest_name, amount_thb_stay, payment').order('check_in', { ascending: true }),
  ])

  const totalExpenses = (expensesRes.data ?? []).reduce((s, r) => s + Math.abs(r.amount ?? 0), 0)
  const totalRevenue = (revenueRes.data ?? []).reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  const totalFounded = (foundingRes.data ?? []).reduce((s, r) => s + (r.amount_thb ?? 0), 0)
  const netPosition = totalRevenue + totalFounded - totalExpenses

  const todosByStatus = (todosRes.data ?? []).reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  const today = new Date()
  const currentGuests = (guestsRes.data ?? []).filter(g => {
    const ci = new Date(g.check_in), co = new Date(g.check_out)
    return ci <= today && co >= today
  })
  const upcomingGuests = (guestsRes.data ?? []).filter(g => {
    const diff = (new Date(g.check_in).getTime() - today.getTime()) / 86400000
    return diff > 0 && diff <= 7
  })

  return (
    <DashboardClient
      totalExpenses={totalExpenses}
      totalRevenue={totalRevenue}
      totalFounded={totalFounded}
      netPosition={netPosition}
      bankBalances={bankRes.data ?? []}
      currentGuests={currentGuests}
      upcomingGuests={upcomingGuests}
      todosByStatus={todosByStatus}
    />
  )
}
