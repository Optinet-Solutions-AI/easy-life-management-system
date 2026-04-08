/**
 * import-from-excel.js
 *
 * Clears and reimports the following tables from the Excel file:
 *   expenses, revenue, founding_contributions, guests,
 *   budget_revenue, budget_expenses, budget_rent
 *
 * Usage:
 *   node scripts/import-from-excel.js
 *
 * Requires xlsx installed in this scripts folder:
 *   cd web/scripts && npm install xlsx @supabase/supabase-js dotenv
 */

require('dotenv').config({ path: `${__dirname}/../.env.local` })
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

const EXCEL_PATH = 'C:/Users/Chris-Optinet/Downloads/Easy Life - Management Board (1).xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ─── Helpers ───────────────────────────────────────────────────────────────────

function excelDateToStr(serial) {
  if (!serial || typeof serial !== 'number') return null
  const date = new Date((serial - 25569) * 86400000)
  return date.toISOString().slice(0, 10)
}

function parseDate(val) {
  if (!val) return null
  if (typeof val === 'number') return excelDateToStr(val)
  if (typeof val === 'string' && val.match(/\d{2}\/\d{2}\/\d{4}/)) {
    const [d, m, y] = val.split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return null
}

function parseNum(val) {
  if (val === null || val === undefined || val === '-' || val === '') return null
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function parseStr(val) {
  if (val === null || val === undefined || val === '-' || val === '') return null
  return String(val).trim()
}

async function clearTable(name) {
  const { error } = await supabase.from(name).delete().not('id', 'is', null)
  if (error) console.error(`  ✗ Could not clear ${name}:`, error.message)
  else console.log(`  ✓ Cleared ${name}`)
}

async function insertBatch(table, rows, batchSize = 100) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) { console.error(`  ✗ Batch ${i}–${i + batch.length} error:`, error.message); continue }
    inserted += batch.length
  }
  console.log(`  ✓ Inserted ${inserted} rows into ${table}`)
}

// ─── Expenses ──────────────────────────────────────────────────────────────────

async function importExpenses(wb) {
  console.log('\n📄 Importing expenses…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Expenses'], { header: 1, defval: null })

  // Header is row 4 (index 3). Data starts row 5 (index 4).
  const rows = []
  for (let i = 4; i < data.length; i++) {
    const r = data[i]
    if (!r || (!r[3] && !r[7])) continue  // skip empty rows

    const paymentDate = parseDate(r[3])
    if (!paymentDate) continue  // must have a payment date

    rows.push({
      audit:               parseStr(r[0]),
      lawyers:             parseStr(r[1]),
      sent:                parseDate(r[2]),
      payment_date:        paymentDate,
      transaction_number:  parseStr(r[4]),
      category:            parseStr(r[5]),
      subcategory:         parseStr(r[6]),
      supplier:            parseStr(r[7]),
      amount:              parseNum(r[8]),
      currency:            'THB',
      method:              parseStr(r[9]),
      paid_by:             parseStr(r[10]),
      internal_document:   r[11] !== null && r[11] !== '-' ? String(r[11]) : null,
      document_page:       r[12] !== null && r[12] !== '-' ? String(r[12]) : null,
      type:                parseStr(r[13]),
      description:         parseStr(r[14]),
      is_legal:            false,
      legal_status:        'Pending',
    })
  }

  await clearTable('expenses')
  await insertBatch('expenses', rows)
}

// ─── Revenue ───────────────────────────────────────────────────────────────────

async function importRevenue(wb) {
  console.log('\n📄 Importing revenue…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Revenue'], { header: 1, defval: null })

  // Header row 3 (index 2): Date | Type | Supplier | Amount THB
  const rows = []
  for (let i = 3; i < data.length; i++) {
    const r = data[i]
    if (!r || !r[0]) continue

    const d = parseDate(r[0])
    if (!d) continue

    rows.push({
      date:       d,
      type:       parseStr(r[1]),
      supplier:   parseStr(r[2]),
      amount_thb: parseNum(r[3]),
    })
  }

  await clearTable('revenue')
  await insertBatch('revenue', rows)
}

// ─── Founding Contributions ────────────────────────────────────────────────────

async function importFounding(wb) {
  console.log('\n📄 Importing founding contributions…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Founding'], { header: 1, defval: null })

  // Header row 4 (index 3): Date | Method | Lorenzo | Stella | Bruce | Hanna | Notes
  const shareholders = ['Lorenzo PAGNAN', 'Stella MAROZZI', 'Bruce MIFSUD', 'Hanna PARSONSON']
  const rows = []

  for (let i = 4; i < data.length; i++) {
    const r = data[i]
    if (!r || !r[0]) continue

    const d = parseDate(r[0])
    if (!d) continue

    const method = parseStr(r[1])
    const notes  = parseStr(r[6])

    // One record per shareholder that has a non-null amount
    shareholders.forEach((sh, idx) => {
      const amount = parseNum(r[2 + idx])
      if (amount !== null && amount !== 0) {
        rows.push({
          date:       d,
          method:     method,
          shareholder: sh,
          amount_thb: amount,
          amount_eur: null,
          notes:      notes,
        })
      }
    })
  }

  await clearTable('founding_contributions')
  await insertBatch('founding_contributions', rows)
}

// ─── Guests ────────────────────────────────────────────────────────────────────

async function importGuests(wb) {
  console.log('\n📄 Importing guests…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Guests'], { header: 1, defval: null })

  // Header row 4 (index 3)
  // Date | Room | Check in | Check out | Nights | Guest Name | Guest(count) |
  // Amount THB (day) | Amount THB (stay) | Paid | Payment | To Pay | Invoice | Notes | Email | Phone | TM30
  const rows = []

  for (let i = 4; i < data.length; i++) {
    const r = data[i]
    if (!r) continue

    const checkIn  = parseDate(r[2])
    const checkOut = parseDate(r[3])
    const guestName = parseStr(r[5])

    if (!checkIn || !checkOut || !guestName) continue

    rows.push({
      date:            parseDate(r[0]),
      room:            r[1] !== null && r[1] !== '' ? (parseInt(String(r[1])) || 0) : 0,
      check_in:        checkIn,
      check_out:       checkOut,
      guest_name:      guestName,
      guest_count:     parseNum(r[6]) ?? 1,
      amount_thb_day:  parseNum(r[7]),
      amount_thb_stay: parseNum(r[8]),
      paid:            parseStr(r[9]),
      payment:         parseNum(r[10]) ?? 0,
      invoice:         parseStr(r[12]),
      notes:           parseStr(r[13]),
      email:           parseStr(r[14]),
      phone:           parseStr(r[15]),
      tm30:            String(r[16] ?? '').toLowerCase() === 'yes',
    })
  }

  await clearTable('guests')
  await insertBatch('guests', rows)
}

// ─── Budget Revenue ────────────────────────────────────────────────────────────

async function importBudgetRevenue(wb) {
  console.log('\n📄 Importing budget revenue…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Budget - Revenue'], { header: 1, defval: null })

  // Row 3 (index 2): 2026 | Jan…Dec | Total
  // Row 4+ (index 3+): Room name | month values…
  const year = 2026
  const seasonRow = data[1] ?? []  // row 2: H/W/L season codes per month
  const rows = []

  for (let ri = 3; ri < data.length; ri++) {
    const r = data[ri]
    if (!r || !r[0] || typeof r[0] !== 'string' || r[0].startsWith('Room Type') || r[0].startsWith('Revenue')) continue

    const roomName = String(r[0]).trim()
    if (!roomName.toLowerCase().startsWith('room')) continue

    for (let m = 1; m <= 12; m++) {
      const amount = parseNum(r[m])
      if (amount === null) continue
      rows.push({
        year,
        month:      m,
        room_name:  roomName,
        amount_thb: amount,
        season:     parseStr(seasonRow[m]) ?? null,
      })
    }
  }

  await clearTable('budget_revenue')
  await insertBatch('budget_revenue', rows)
}

// ─── Budget Expenses ───────────────────────────────────────────────────────────

async function importBudgetExpenses(wb) {
  console.log('\n📄 Importing budget expenses…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Budget - Expenses'], { header: 1, defval: null })

  // Defines which rows are leaf items, their category/expense_type
  // Format: [row_index_0based, expense_type, category, item_name]
  const ITEMS = [
    // OPEX — Staff Costs
    [7,  'OPEX', 'Staff Costs',          'Management'],
    [8,  'OPEX', 'Staff Costs',          'Housekeeping'],
    [9,  'OPEX', 'Staff Costs',          'Gardener'],
    [10, 'OPEX', 'Staff Costs',          'Gardener Support'],
    [11, 'OPEX', 'Staff Costs',          'Maintenance'],
    [12, 'OPEX', 'Staff Costs',          'Reception'],
    [13, 'OPEX', 'Staff Costs',          'Bonuses / Incentives'],
    [14, 'OPEX', 'Staff Costs',          'Social Security / Taxes'],
    [15, 'OPEX', 'Staff Costs',          'Uniforms'],
    // OPEX — Rooms Department
    [18, 'OPEX', 'Rooms Department',     'Cleaning Supplies'],
    [19, 'OPEX', 'Rooms Department',     'Laundry (Linen, Towels)'],
    [20, 'OPEX', 'Rooms Department',     'Guest Amenities'],
    [21, 'OPEX', 'Rooms Department',     'Housekeeping Equipment'],
    // OPEX — Utilities
    [24, 'OPEX', 'Utilities',            'Electricity'],
    [25, 'OPEX', 'Utilities',            'Water'],
    [26, 'OPEX', 'Utilities',            'Bills / Signs'],
    [27, 'OPEX', 'Utilities',            'Internet'],
    // OPEX — Maintenance & Repairs
    [30, 'OPEX', 'Maintenance & Repairs','Routine Maintenance - Old Bungalows'],
    [31, 'OPEX', 'Maintenance & Repairs','Furniture - Old Bungalows'],
    [32, 'OPEX', 'Maintenance & Repairs','Equipment - Old Bungalows'],
    [33, 'OPEX', 'Maintenance & Repairs','Garden Maintenance'],
    [34, 'OPEX', 'Maintenance & Repairs','Repairs'],
    // OPEX — General & Admin
    [37, 'OPEX', 'General & Admin',      'Accounting'],
    [38, 'OPEX', 'General & Admin',      'Legal'],
    [39, 'OPEX', 'General & Admin',      'Bank Fees'],
    [40, 'OPEX', 'General & Admin',      'Software Subscriptions'],
    [41, 'OPEX', 'General & Admin',      'Office Supplies'],
    [42, 'OPEX', 'General & Admin',      'Communication'],
    // OPEX — Insurance & Licenses
    [45, 'OPEX', 'Insurance & Licenses', 'Property Insurance'],
    [46, 'OPEX', 'Insurance & Licenses', 'Liability Insurance'],
    [47, 'OPEX', 'Insurance & Licenses', 'Licenses'],
    // OPEX — Rent / Lease
    [50, 'OPEX', 'Rent / Lease',         'Land Rent'],
    [51, 'OPEX', 'Rent / Lease',         'Building Rent'],
    // OPEX — Financial Costs
    [54, 'OPEX', 'Financial Costs',      'Bank Charges'],
    [55, 'OPEX', 'Financial Costs',      'Exchange'],
    // OPEX — Sales & Marketing
    [58, 'OPEX', 'Sales & Marketing',    'OTA Commissions'],
    [59, 'OPEX', 'Sales & Marketing',    'Website Costs'],
    [60, 'OPEX', 'Sales & Marketing',    'Digital Marketing / Ads'],
    [61, 'OPEX', 'Sales & Marketing',    'Content Creation'],
    [62, 'OPEX', 'Sales & Marketing',    'Agency Fees'],
    // OPEX — Travel
    [65, 'OPEX', 'Travel',               'Taxi'],
    [66, 'OPEX', 'Travel',               'Flights'],
    [67, 'OPEX', 'Travel',               'Hotel'],
    // CAPEX
    [73, 'CAPEX','CAPEX',                'Renovation Works'],
    [74, 'CAPEX','CAPEX',                'Furniture'],
    [75, 'CAPEX','CAPEX',                'Equipment'],
    [76, 'CAPEX','CAPEX',                'IT Systems'],
    [77, 'CAPEX','CAPEX',                'Security Systems'],
  ]

  const year = 2026
  const rows = []

  ITEMS.forEach(([rowIdx, expenseType, category, itemName]) => {
    const r = data[rowIdx]
    if (!r) return
    for (let m = 1; m <= 12; m++) {
      const amount = parseNum(r[m])
      if (amount === null) return
      rows.push({
        year,
        month:        m,
        expense_type: expenseType,
        category,
        subcategory:  null,
        item_name:    itemName,
        amount_thb:   amount,
      })
    }
  })

  await clearTable('budget_expenses')
  await insertBatch('budget_expenses', rows)
}

// ─── Budget Rent ───────────────────────────────────────────────────────────────

async function importBudgetRent(wb) {
  console.log('\n📄 Importing budget rent…')
  const data = XLSX.utils.sheet_to_json(wb.Sheets['Budget - Rent'], { header: 1, defval: null })

  // Row 4+ (index 3+): year_number | year_label | rent_thb | null | eur_equivalent
  const rows = []
  for (let i = 3; i < data.length; i++) {
    const r = data[i]
    if (!r || typeof r[0] !== 'number' || !r[1]) continue

    rows.push({
      year_number: parseInt(r[0]),
      year_label:  parseStr(r[1]),
      rent_thb:    parseNum(r[2]) ?? 0,
      vat_amount:  null,
    })
  }

  await clearTable('budget_rent')
  await insertBatch('budget_rent', rows)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📊 Loading Excel file…')
  const wb = XLSX.readFile(EXCEL_PATH)
  console.log('✓ Sheets found:', wb.SheetNames.join(', '))

  await importExpenses(wb)
  await importRevenue(wb)
  await importFounding(wb)
  await importGuests(wb)
  await importBudgetRevenue(wb)
  await importBudgetExpenses(wb)
  await importBudgetRent(wb)

  console.log('\n✅ Import complete!')
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1) })
