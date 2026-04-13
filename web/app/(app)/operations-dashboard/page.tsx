import { supabase } from '@/lib/supabase'
import OperationsDashClient from './OperationsDashClient'

export default async function OperationsDashboardPage() {
  // Date 30 days from now for fire extinguisher alert threshold
  const alertThreshold = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const [guestRes, todoRes, revRes, accountRes, expRes, extRes] = await Promise.all([
    supabase.from('guests').select('*').order('check_in', { ascending: true }),
    supabase.from('todos').select('*').order('target_date', { ascending: true }),
    supabase.from('revenue').select('amount_thb, date, type').order('date', { ascending: false }).limit(30),
    supabase.from('account_balances').select('*').order('account_type'),
    supabase.from('expenses').select('amount, payment_date, category, supplier, document_number').order('payment_date', { ascending: false }).limit(50),
    supabase.from('room_fire_extinguishers')
      .select('id, location, expiry_date, serial_number, rooms(number, name)')
      .lte('expiry_date', alertThreshold)
      .order('expiry_date'),
  ])

  // Calculate no-invoice total from all expenses missing a document_number
  const noInvoiceTotal = (expRes.data ?? [])
    .filter(e => !e.document_number || String(e.document_number).trim() === '')
    .reduce((s, e) => s + Math.abs(e.amount ?? 0), 0)

  return (
    <OperationsDashClient
      guests={guestRes.data ?? []}
      todos={todoRes.data ?? []}
      revenues={revRes.data ?? []}
      accountBalances={accountRes.data ?? []}
      noInvoiceTotal={noInvoiceTotal}
      expenses={expRes.data ?? []}
      fireAlerts={extRes.data ?? []}
    />
  )
}
