import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const TABLES: Record<string, string> = {
  guests:                  'Guests',
  expenses:                'Expenses',
  revenue:                 'Revenue',
  founding_contributions:  'Founding',
  shareholder_work:        'Shareholder Work',
  todos:                   'Tasks',
  budget_rent:             'Budget Rent',
  budget_revenue:          'Budget Revenue',
  budget_expenses:         'Budget Expenses',
  complaints:              'Complaints',
  staff_hours:             'Staff Hours',
  shareholder_meetings:    'SH Meetings',
  shareholder_profiles:    'SH Profiles',
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table') ?? 'ALL'

  const wb = XLSX.utils.book_new()

  const tableKeys = table === 'ALL' ? Object.keys(TABLES) : [table]

  for (const key of tableKeys) {
    if (!TABLES[key]) continue
    const { data, error } = await supabase.from(key).select('*').order('created_at', { ascending: true })
    if (error || !data) continue
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, TABLES[key])
  }

  const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const uint8 = new Uint8Array(arr)

  const filename = table === 'ALL'
    ? `DMS_Export_${new Date().toISOString().slice(0,10)}.xlsx`
    : `${TABLES[table] ?? table}_${new Date().toISOString().slice(0,10)}.xlsx`

  return new Response(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
