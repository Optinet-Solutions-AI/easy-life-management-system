import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const ALLOWED_TABLES = [
  'guests',
  'expenses',
  'revenue',
  'founding_contributions',
  'shareholder_work',
  'todos',
  'budget_revenue',
  'budget_expenses',
  'budget_rent',
  'complaints',
  'staff_hours',
  'shareholder_meetings',
  'shareholder_profiles',
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { table } = await req.json() as { table: AllowedTable | 'ALL' }

  const tables: AllowedTable[] = table === 'ALL' ? [...ALLOWED_TABLES] : [table as AllowedTable]

  if (!tables.every(t => ALLOWED_TABLES.includes(t as AllowedTable))) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  const results: Record<string, string> = {}

  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    results[t] = error ? `Error: ${error.message}` : 'cleared'
  }

  return NextResponse.json({ results })
}
