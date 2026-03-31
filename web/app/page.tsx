import { supabase } from '@/lib/supabase'
import { formatTHB } from '@/types'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'

export default async function DashboardPage() {
  const [expensesRes, revenueRes, foundingRes, bankRes, todosRes, guestsRes] = await Promise.all([
    supabase.from('expenses').select('amount'),
    supabase.from('revenue').select('amount_thb'),
    supabase.from('founding_contributions').select('amount_thb'),
    supabase.from('bank_balances').select('*').order('recorded_date', { ascending: false }).limit(5),
    supabase.from('todos').select('status'),
    supabase.from('guests').select('check_in, check_out, room, guest_name, amount_thb_stay, payment').order('check_in', { ascending: true }),
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
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Dashboard" subtitle="Status of Account" />

      {/* Financial Summary */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Financial Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Expenses" value={formatTHB(totalExpenses)} color="red" />
          <StatCard label="Total Revenue" value={formatTHB(totalRevenue)} color="green" />
          <StatCard label="Capital Founded" value={formatTHB(totalFounded)} color="blue" />
          <StatCard label="Net Position" value={formatTHB(netPosition)} color={netPosition >= 0 ? 'green' : 'red'} sub="Revenue + Founded − Expenses" />
        </div>
      </section>

      {/* Bank Balances */}
      {(bankRes.data ?? []).length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Account Balances</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(bankRes.data ?? []).map(b => (
              <StatCard key={b.id} label={b.label} value={formatTHB(b.amount)} sub={b.status ?? undefined} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Guests */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Currently In-House ({currentGuests.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {currentGuests.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No guests currently in-house.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[340px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Room</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Guest</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 hidden sm:table-cell">Check-Out</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentGuests.map(g => {
                      const balance = (g.amount_thb_stay ?? 0) - (g.payment ?? 0)
                      return (
                        <tr key={`${g.room}-${g.guest_name}`}>
                          <td className="px-3 py-2 font-medium">#{g.room}</td>
                          <td className="px-3 py-2">{g.guest_name}</td>
                          <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{new Date(g.check_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                          <td className={`px-3 py-2 text-right font-medium text-sm ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatTHB(balance)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Check-ins */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Arriving in 7 Days ({upcomingGuests.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {upcomingGuests.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No arrivals in the next 7 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[300px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Room</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Guest</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Check-In</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 hidden sm:table-cell">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingGuests.map(g => (
                      <tr key={`${g.room}-${g.guest_name}`}>
                        <td className="px-3 py-2 font-medium">#{g.room}</td>
                        <td className="px-3 py-2">{g.guest_name}</td>
                        <td className="px-3 py-2 text-slate-500">{new Date(g.check_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                        <td className="px-3 py-2 text-right font-medium hidden sm:table-cell">{formatTHB(g.amount_thb_stay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Task Summary */}
        <section className="lg:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Tasks Summary</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
            {[
              { label: 'Complete', color: 'text-green-600 bg-green-50' },
              { label: 'Ongoing', color: 'text-blue-600 bg-blue-50' },
              { label: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
              { label: 'Blocked', color: 'text-red-600 bg-red-50' },
            ].map(({ label, color }) => (
              <div key={label} className={`rounded-lg px-3 py-3 ${color}`}>
                <p className="text-2xl font-bold">{todosByStatus[label] ?? 0}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
