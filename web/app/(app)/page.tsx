import { supabase } from '@/lib/supabase'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const [bankRes, todosRes, guestsRes] = await Promise.all([
    supabase.from('bank_balances').select('*').order('recorded_date', { ascending: false }).limit(5),
    supabase.from('todos').select('status'),
    supabase.from('guests')
      .select('id, check_in, check_out, room, guest_name, amount_thb_stay, payment')
      .order('check_in', { ascending: true }),
  ])

  const today = new Date()

  const currentGuests = (guestsRes.data ?? []).filter(g => {
    const ci = new Date(g.check_in), co = new Date(g.check_out)
    return ci <= today && co >= today
  })
  const upcomingGuests = (guestsRes.data ?? []).filter(g => {
    const diff = (new Date(g.check_in).getTime() - today.getTime()) / 86400000
    return diff > 0 && diff <= 7
  })

  const todosByStatus = (todosRes.data ?? []).reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <DashboardClient
      bankBalances={bankRes.data ?? []}
      currentGuests={currentGuests}
      upcomingGuests={upcomingGuests}
      todosByStatus={todosByStatus}
    />
  )
}
