import { supabase } from '@/lib/supabase'
import OperationsDashClient from './OperationsDashClient'

export default async function OperationsDashboardPage() {
  const [guestRes, todoRes, revRes, accountRes, expRes] = await Promise.all([
    supabase.from('guests').select('*').order('check_in', { ascending: true }),
    supabase.from('todos').select('*').order('target_date', { ascending: true }),
    supabase.from('revenue').select('amount_thb, date, type').order('date', { ascending: false }).limit(30),
    supabase.from('account_balances').select('*').order('account_type'),
    supabase.from('expenses').select('amount, payment_date, category, supplier, document_number').order('payment_date', { ascending: false }).limit(50),
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
    />
  )
}
