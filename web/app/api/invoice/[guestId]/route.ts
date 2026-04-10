import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function pad(n: number) { return String(n).padStart(2, '0') }

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

function wordsUnder1000(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? ' ' + ONES[n%10] : '')
  return ONES[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + wordsUnder1000(n%100) : '')
}

function numberToWords(n: number): string {
  const whole = Math.round(n)
  if (whole === 0) return 'Zero Baht Only'
  const millions = Math.floor(whole / 1_000_000)
  const thousands = Math.floor((whole % 1_000_000) / 1_000)
  const remainder = whole % 1_000
  let result = ''
  if (millions) result += wordsUnder1000(millions) + ' Million '
  if (thousands) result += wordsUnder1000(thousands) + ' Thousand '
  if (remainder) result += wordsUnder1000(remainder)
  return result.trim() + ' Baht Only'
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ guestId: string }> }
) {
  const { guestId } = await params
  const { data: g, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .single()

  if (error || !g) {
    return new NextResponse('Guest not found', { status: 404 })
  }

  const nights = Math.max(0, Math.round(
    (new Date(g.check_out).getTime() - new Date(g.check_in).getTime()) / 86400000
  ))

  const totalWithVat = g.amount_thb_stay ?? 0
  const subtotal = totalWithVat / 1.07
  const vat = totalWithVat - subtotal
  const unitPrice = nights > 0 ? subtotal / nights : 0
  const deposit = g.payment ?? 0
  const balanceDue = totalWithVat - deposit

  const invoiceNum = 'INV-' + g.id.replace(/-/g, '').slice(0, 6).toUpperCase()

  const today = new Date()
  const invoiceDate = fmtDate(g.check_out ?? today.toISOString().split('T')[0])

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Invoice – ${g.guest_name} Room ${g.room}</title>
    <style>
        :root {
            --dark-green: #1E6B3E;
            --light-green: #25AE5A;
            --border-green: #B5D5C0;
            --bg-tint-green: #F4F9F6;
            --text-dark: #333333;
            --text-muted: #888888;
            --line-color: #EAEAEA;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #E9E9E9;
            padding: 40px 20px;
            color: var(--text-dark);
            -webkit-font-smoothing: antialiased;
        }
        @media print {
            body { background-color: #fff; padding: 0; }
            .no-print { display: none !important; }
        }
        .invoice-container {
            max-width: 850px;
            margin: 0 auto;
            background-color: #FFFFFF;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .invoice-footer {
            max-width: 850px;
            margin: 0 auto;
            padding: 12px 40px;
            background-color: var(--dark-green);
            text-align: center;
            font-size: 11px;
            color: #A3CCB4;
            letter-spacing: 0.2px;
        }
        .header {
            background-color: var(--dark-green);
            color: #FFFFFF;
            padding: 35px 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header-left h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
        .header-left p { font-size: 11px; color: #A3CCB4; margin-bottom: 4px; font-weight: 400; letter-spacing: 0.2px; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 15px; }
        .logo-circle {
            width: 90px; height: 90px; border-radius: 50%;
            border: 2px solid #5A9973;
            display: flex; align-items: center; justify-content: center;
            color: #A3CCB4; font-size: 14px; font-weight: 700; letter-spacing: 1px;
        }
        .badge {
            background-color: var(--light-green);
            color: #FFFFFF;
            padding: 10px 24px;
            border-radius: 25px;
            font-weight: 700;
            font-size: 13px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .content { padding: 35px 40px 50px 40px; }
        .top-info-bar {
            display: flex;
            justify-content: space-between;
            border: 1px solid var(--border-green);
            background-color: var(--bg-tint-green);
            border-radius: 8px;
            padding: 15px 30px;
            margin-bottom: 30px;
        }
        .info-block { display: flex; flex-direction: column; gap: 4px; }
        .info-block .label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
        .info-block .value { font-size: 14px; font-weight: 700; color: var(--text-dark); }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 35px; }
        .detail-row { margin-bottom: 15px; }
        .detail-row .label { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.5px; }
        .detail-row .value { display: block; font-size: 13px; color: var(--text-dark); }
        .val-bill-to { color: var(--dark-green) !important; font-size: 18px !important; font-weight: 700; }
        .val-nights { color: var(--light-green) !important; font-weight: 700; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 10px; }
        th { background-color: var(--dark-green); color: #FFFFFF; text-align: left; padding: 12px 15px; font-size: 12px; font-weight: 700; }
        th:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
        th:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
        td { padding: 12px 15px; font-size: 13px; color: var(--text-dark); border-bottom: 1px solid var(--line-color); }
        .text-right { text-align: right; }
        .table-subtotal { display: flex; justify-content: flex-end; align-items: center; padding: 10px 15px 10px 0; margin-bottom: 35px; }
        .table-subtotal .lbl { color: var(--text-muted); font-size: 12px; margin-right: 40px; }
        .table-subtotal .val { color: var(--text-dark); font-weight: 700; font-size: 13px; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; align-items: flex-start; }
        .amount-words-box { border: 1px solid var(--border-green); background-color: var(--bg-tint-green); border-radius: 8px; padding: 18px 20px; margin-top: 5px; }
        .amount-words-box .label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .amount-words-box .words { color: var(--dark-green); font-size: 16px; font-weight: 700; font-style: italic; }
        .totals-box { border: 1px solid var(--border-green); border-radius: 8px; overflow: hidden; background-color: #FFFFFF; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid var(--line-color); }
        .total-row:last-child { border-bottom: none; }
        .total-row .lbl { color: var(--text-muted); font-size: 12px; }
        .total-row .val { color: var(--text-dark); font-size: 13px; }
        .total-row.dark-row { background-color: var(--dark-green); border-bottom: none; }
        .total-row.dark-row .lbl, .total-row.dark-row .val { color: #FFFFFF; font-weight: 700; font-size: 13px; }
        .total-row.light-row { background-color: var(--light-green); border-bottom: none; }
        .total-row.light-row .lbl, .total-row.light-row .val { color: #FFFFFF; font-weight: 700; font-size: 13px; }
        .footer { margin-top: 60px; }
        .signature-block { width: 280px; }
        .signature-block p { margin: 0 0 5px 0; font-size: 11px; color: var(--text-muted); }
        .signature-line { height: 1px; background-color: var(--dark-green); margin: 15px 0 5px 0; }
        .signature-title { font-size: 12px; font-style: italic; color: var(--text-dark); font-weight: 700; }
        .print-btn {
            display: block; margin: 20px auto 0; padding: 12px 32px;
            background: var(--dark-green); color: #fff; border: none;
            border-radius: 8px; font-size: 14px; font-weight: 600;
            cursor: pointer; letter-spacing: 0.3px;
        }
        .print-btn:hover { background: #155230; }
    </style>
</head>
<body>

<div class="invoice-container">
    <header class="header">
        <div class="header-left">
            <h1>Dream-T CO., Ltd.</h1>
            <p>The Trendy Building, 6th Floor, Sukhumvit Soi 13, Watthana, Bangkok 10110, Thailand</p>
            <p>Taxpayer ID: 0105568076277&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;Branch: Koh Phangan&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;info@DreamT-CO.com</p>
        </div>
        <div class="header-right">
            <div class="logo-circle">DREAM-T</div>
            <div class="badge">TAX INVOICE / RECEIPT</div>
        </div>
    </header>

    <div class="content">
        <div class="top-info-bar">
            <div class="info-block">
                <span class="label">Invoice No.</span>
                <span class="value">${invoiceNum}</span>
            </div>
            <div class="info-block">
                <span class="label">Invoice Date</span>
                <span class="value">${invoiceDate}</span>
            </div>
            <div class="info-block">
                <span class="label">Room No.</span>
                <span class="value">${g.room}</span>
            </div>
            <div class="info-block">
                <span class="label">Guest</span>
                <span class="value">${g.guest_name}</span>
            </div>
        </div>

        <div class="details-grid">
            <div class="details-left">
                <div class="detail-row">
                    <span class="label">Bill To</span>
                    <span class="value val-bill-to">${g.guest_name}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Contact / Email</span>
                    <span class="value">${g.email ?? '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Phone</span>
                    <span class="value">${g.phone ?? '—'}</span>
                </div>
            </div>
            <div class="details-right">
                <div class="detail-row">
                    <span class="label">Check-In</span>
                    <span class="value">${fmtDate(g.check_in)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Check-Out</span>
                    <span class="value">${fmtDate(g.check_out)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Nights</span>
                    <span class="value val-nights">${nights}</span>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th width="15%">Date</th>
                    <th width="35%">Description</th>
                    <th width="10%">Ref</th>
                    <th width="10%" class="text-right">Qty</th>
                    <th width="15%" class="text-right">Unit Price (THB)</th>
                    <th width="15%" class="text-right">Amount (THB)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${fmtDate(g.check_out)}</td>
                    <td>Room Charge – Room ${g.room}</td>
                    <td>RM</td>
                    <td class="text-right">${nights}</td>
                    <td class="text-right">${fmtNum(unitPrice)}</td>
                    <td class="text-right">${fmtNum(subtotal)}</td>
                </tr>
            </tbody>
        </table>

        <div class="table-subtotal">
            <span class="lbl">Subtotal:</span>
            <span class="val">${fmtNum(subtotal)}</span>
        </div>

        <div class="bottom-grid">
            <div class="bottom-left">
                <div class="amount-words-box">
                    <div class="label">Amount In Words</div>
                    <div class="words">${numberToWords(totalWithVat)}</div>
                </div>
            </div>

            <div class="bottom-right">
                <div class="totals-box">
                    <div class="total-row">
                        <span class="lbl">Subtotal (before VAT)</span>
                        <span class="val">${fmtNum(subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span class="lbl">Service Charge %</span>
                        <span class="val">0.00%</span>
                    </div>
                    <div class="total-row">
                        <span class="lbl">Service Charge</span>
                        <span class="val">0.00</span>
                    </div>
                    <div class="total-row">
                        <span class="lbl">VAT 7%</span>
                        <span class="val">${fmtNum(vat)}</span>
                    </div>
                    <div class="total-row dark-row">
                        <span class="lbl">TOTAL (THB)</span>
                        <span class="val">${fmtNum(totalWithVat)}</span>
                    </div>
                    <div class="total-row">
                        <span class="lbl">Deposit / Prepaid</span>
                        <span class="val">${fmtNum(deposit)}</span>
                    </div>
                    <div class="total-row light-row">
                        <span class="lbl">Balance Due (THB)</span>
                        <span class="val">${fmtNum(balanceDue)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="signature-block">
                <p>Authorized Signature</p>
                <p>Date: ${invoiceDate}</p>
                <div class="signature-line"></div>
                <div class="signature-title">General Manager – Dream-T CO., Ltd.</div>
            </div>
        </div>
    </div>
</div>

<div class="invoice-footer">
    Dream-T CO., Ltd.&nbsp;&nbsp;|&nbsp;&nbsp;Koh Phangan&nbsp;&nbsp;|&nbsp;&nbsp;info@DreamT-CO.com&nbsp;&nbsp;|&nbsp;&nbsp;Taxpayer ID: 0105568076277
</div>

<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
