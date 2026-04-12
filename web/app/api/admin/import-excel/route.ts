import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(v: unknown): string | null {
  if (v == null) return null
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    // Use local date parts — toISOString() returns UTC which shifts the date in UTC+7/+8
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s || s === '-' || s === 'None') return null
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  }
  return null
}

function clean(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s === '-' || s === 'None' || s === 'null') return null
  return s
}

function num(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'string' && (v.trim() === '-' || v.trim() === '')) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

// Returns data rows starting at `fromRow` (1-based), skips fully empty rows
// raw: true preserves actual numbers/Date objects instead of formatted strings ("THB 1,234.00" etc.)
function getRows(ws: XLSX.WorkSheet, fromRow: number): unknown[][] {
  const all = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true })
  return all.slice(fromRow - 1).filter(r => Array.isArray(r) && r.some(c => c != null && String(c).trim() !== ''))
}

// ── sheet parsers ─────────────────────────────────────────────────────────────
//  Column mappings verified against "Easy Life - Management Board (2).xlsx"

function parseGuests(wb: XLSX.WorkBook) {
  const ws = wb.Sheets['Guests']
  if (!ws) return []
  // Row 1: title, Row 2: headers, Row 3+: data
  const out = []
  for (const row of getRows(ws, 3)) {
    const roomRaw = row[1]
    if (!roomRaw) continue
    const room = parseInt(String(roomRaw))
    if (isNaN(room)) continue
    const check_in  = fmtDate(row[2])
    const check_out = fmtDate(row[3])
    if (!check_in || !check_out) continue
    const amount_day  = num(row[7])
    let   amount_stay = num(row[8])
    const nights = (() => {
      try { return Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000) } catch { return 0 }
    })()
    if (amount_day && nights && !amount_stay) amount_stay = amount_day * nights
    out.push({
      date:          fmtDate(row[0]),
      room,
      check_in,
      check_out,
      guest_name:    clean(row[5]) ?? 'Unknown',
      guest_count:   parseInt(String(row[6] ?? 1)) || 1,
      amount_thb_day:  amount_day,
      amount_thb_stay: amount_stay,
      paid:    clean(row[9]),
      payment: Math.abs(num(row[10]) ?? 0),
      invoice: clean(row[12]),
      notes:   clean(row[13]),
      email:   clean(row[14]),
      phone:   clean(row[15]),
      tm30:    String(row[16] ?? '').toLowerCase().trim() === 'yes',
    })
  }
  return out
}

function parseExpenses(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: totals row, Row 3: headers, Row 4+: data
  // New column layout (v2):
  //  0:audit  1:lawyers  2:sent  3:payment_date  4:transaction_number
  //  5:category  6:subcategory  7:supplier  8:amount  9:method
  //  10:paid_by  11:internal_document  12:document_page  13:type  14:description
  const ws = wb.Sheets['Expenses']
  if (!ws) return []
  const txnRefs = new Set<string>()
  const out = []
  for (const row of getRows(ws, 4)) {
    const txn = clean(row[4])
    if (!txn) continue
    if (txnRefs.has(txn)) continue
    txnRefs.add(txn)
    const rawAmount = num(row[8])
    if (rawAmount == null) continue
    out.push({
      audit:                clean(row[0]),
      lawyers:              clean(row[1]),
      sent:                 fmtDate(row[2]),
      to_verify:            null,
      payment_date:         fmtDate(row[3]),
      transaction_number:   txn,
      document_number:      null,
      category:             clean(row[5]),
      subcategory:          clean(row[6]),
      supplier:             clean(row[7]),
      amount:               Math.abs(rawAmount),
      currency:             'THB',
      method:               clean(row[9]),
      paid_by:              clean(row[10]),
      internal_document:    clean(row[11]),
      document_page:        clean(row[12]),
      type:                 clean(row[13]),
      description:          clean(row[14]),
      is_legal:             false,
    })
  }
  return { rows: out, refs: txnRefs }
}

function parseLegalExpenses(wb: XLSX.WorkBook, existingRefs: Set<string>) {
  // Row 1-2: title/total, Row 3: headers, Row 4+: data
  // Col: 0:lawyers 1:sent 2:to_verify 3:payment_date 4:transaction_number
  //      5:document_number 6:category 7:subcategory 8:supplier 9:amount
  //      10:currency 11:method 12:internal_document 13:document_page 14:type 15:description
  const ws = wb.Sheets['Expenses Shared with Legal']
  if (!ws) return []
  const out = []
  for (const row of getRows(ws, 4)) {
    const txn = clean(row[4])
    if (!txn) continue
    if (existingRefs.has(txn)) continue
    existingRefs.add(txn)
    const rawAmount = num(row[9])
    if (rawAmount == null) continue
    out.push({
      audit:                null,
      lawyers:              clean(row[0]),
      sent:                 fmtDate(row[1]),
      to_verify:            clean(row[2]),
      payment_date:         fmtDate(row[3]),
      transaction_number:   txn,
      document_number:      clean(row[5]),
      category:             clean(row[6]),
      subcategory:          clean(row[7]),
      supplier:             clean(row[8]),
      amount:               Math.abs(rawAmount),
      currency:             clean(row[10]) ?? 'THB',
      method:               clean(row[11]),
      paid_by:              null,
      internal_document:    clean(row[12]),
      document_page:        clean(row[13]),
      type:                 clean(row[14]),
      description:          clean(row[15]),
      is_legal:             true,
    })
  }
  return out
}

function parseRevenue(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: headers, Row 3+: data
  const ws = wb.Sheets['Revenue']
  if (!ws) return []
  const out = []
  for (const row of getRows(ws, 3)) {
    const d = fmtDate(row[0])
    if (!d) continue
    const amount = num(row[3])
    if (amount == null) continue
    out.push({ date: d, type: clean(row[1]), supplier: clean(row[2]), amount_thb: amount, notes: null })
  }
  return out
}

function parseFounding(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: totals, Row 3: headers, Row 4+: data
  const ws = wb.Sheets['Founding']
  if (!ws) return []
  const COLS: Record<number, string> = { 2: 'Lorenzo PAGNAN', 3: 'Stella MAROZZI', 4: 'Bruce MIFSUD', 5: 'Hanna PARSONSON' }
  const out = []
  for (const row of getRows(ws, 4)) {
    const d = fmtDate(row[0])
    if (!d) continue
    const method = clean(row[1])
    const notes  = clean(row[6])
    for (const [col, shareholder] of Object.entries(COLS)) {
      const rawAmount = num(row[Number(col)])
      if (!rawAmount || rawAmount === 0) continue
      const amount = Math.abs(rawAmount)
      if (amount === 0) continue
      out.push({ date: d, method, shareholder, amount_thb: amount, amount_eur: null, notes })
    }
  }
  return out
}

function parseShareholderWork(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: subtitle, Row 3: headers, Row 4+: data
  // Cols: 0:month 1:hour_rate 2:Lorenzo hours 3:Lorenzo THB 4:Stella hours ...
  const ws = wb.Sheets['Shareholder Work']
  if (!ws) return []
  const COLS: Record<number, string> = { 2: 'Lorenzo PAGNAN', 4: 'Stella MAROZZI', 6: 'Bruce MIFSUD', 8: 'Hanna PARSONSON' }
  const out = []
  for (const row of getRows(ws, 4)) {
    const d = fmtDate(row[0])
    if (!d) continue
    const rate = num(row[1]) ?? 200
    for (const [col, shareholder] of Object.entries(COLS)) {
      const hours = num(row[Number(col)])
      if (!hours || hours === 0) continue
      out.push({ month: d, shareholder, hours, hour_rate: rate })
    }
  }
  return out
}

function parseTodos(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: headers, Row 3+: data
  const ws = wb.Sheets['To Do']
  if (!ws) return []
  const VALID = ['Pending', 'Ongoing', 'Complete', 'Blocked']
  const out = []
  for (const row of getRows(ws, 3)) {
    const topic = clean(row[2])
    if (!topic || topic.toUpperCase() === 'TOPIC') continue
    const statusRaw = clean(row[6]) ?? 'Pending'
    out.push({
      project:            clean(row[0]) ?? 'EasyLife',
      department:         clean(row[1]),
      topic,
      responsible_person: clean(row[3]),
      status_notes:       clean(row[4]),
      target_date:        fmtDate(row[5]),
      status:             VALID.includes(statusRaw) ? statusRaw : 'Pending',
    })
  }
  return out
}

function parseBudgetRent(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: headers, Row 3+: data
  const ws = wb.Sheets['Budget - Rent']
  if (!ws) return []
  const out = []
  for (const row of getRows(ws, 3)) {
    const year_number = num(row[0])
    if (!year_number) continue
    const rent = num(row[2])
    if (!rent) continue
    out.push({
      year_number: Math.round(year_number),
      year_label:  clean(row[1]) ?? `Rent ${2024 + Math.round(year_number)}`,
      rent_thb:    rent,
      vat_amount:  Math.round(rent * 0.0266 * 100) / 100,
    })
  }
  return out
}

function parseBudgetRevenue(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: season row, Row 3: year/month headers, Row 4+: room data
  const ws = wb.Sheets['Budget - Revenue']
  if (!ws) return []
  const all = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
  const yearRow = all[2] ?? []
  const year = num(yearRow[0]) ? Math.round(num(yearRow[0])!) : 2026
  const out = []
  for (const row of getRows(ws, 4)) {
    const room_name = clean(row[0])
    if (!room_name || room_name.toLowerCase() === 'room') continue
    for (let m = 0; m < 12; m++) {
      const amount = num(row[m + 1])
      if (amount && amount > 0) out.push({ year, month: m + 1, room_name, amount_thb: amount, season: null })
    }
  }
  return out
}

function parseBudgetExpenses(wb: XLSX.WorkBook) {
  // Row 1: title, Row 2: year/header, Row 3: "OPERATING COSTS (OPEX)" total row, Row 4+: items
  const ws = wb.Sheets['Budget - Expenses']
  if (!ws) return []
  const all = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
  const yearRow = all[1] ?? []   // Row 2 (0-indexed: 1)
  const year = num(yearRow[0]) ? Math.round(num(yearRow[0])!) : 2026
  let currentType = 'OPEX'
  const out = []
  // Start from row 3 (0-indexed: 2)
  for (const row of (all.slice(2) as unknown[][])) {
    if (!Array.isArray(row) || !row.some(c => c != null && String(c).trim() !== '')) continue
    const item_name = clean(row[0])
    if (!item_name) continue
    if (item_name.includes('CAPEX') || item_name.includes('CAPITAL')) { currentType = 'CAPEX'; continue }
    if (item_name.includes('OPEX') || item_name.includes('OPERATING')) { currentType = 'OPEX'; continue }
    const hasAmounts = Array.from({ length: 12 }, (_, i) => num(row[i + 1])).some(v => v != null && v > 0)
    if (!hasAmounts) continue
    for (let m = 0; m < 12; m++) {
      const amount = num(row[m + 1])
      if (amount && amount > 0) {
        out.push({ year, month: m + 1, category: currentType, item_name, amount_thb: amount, expense_type: currentType })
      }
    }
  }
  return out
}

// ── main handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  const log: string[] = []

  async function insert(table: string, data: object[], batchSize = 50) {
    if (!data.length) { log.push(`${table}: 0 rows — skipped`); return }
    let count = 0
    for (let i = 0; i < data.length; i += batchSize) {
      const { error } = await supabase.from(table).insert(data.slice(i, i + batchSize))
      if (error) { log.push(`${table}: ✗ ERROR — ${error.message}`); return }
      count += Math.min(batchSize, data.length - i)
    }
    log.push(`${table}: ✓ ${count} rows inserted`)
  }

  // Guests
  await insert('guests', parseGuests(wb))

  // Expenses (both sheets, deduped by transaction number)
  const { rows: expRows, refs } = parseExpenses(wb) as { rows: object[], refs: Set<string> }
  const legalRows = parseLegalExpenses(wb, refs) as object[]
  await insert('expenses', [...expRows, ...legalRows])

  await insert('revenue',                parseRevenue(wb))
  await insert('founding_contributions', parseFounding(wb))
  await insert('shareholder_work',       parseShareholderWork(wb))
  await insert('todos',                  parseTodos(wb))
  await insert('budget_rent',            parseBudgetRent(wb))
  await insert('budget_revenue',         parseBudgetRevenue(wb))
  await insert('budget_expenses',        parseBudgetExpenses(wb))

  return NextResponse.json({ log })
}
