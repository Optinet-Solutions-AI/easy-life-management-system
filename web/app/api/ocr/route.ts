import { NextRequest, NextResponse } from 'next/server'

export interface OcrResult {
  supplier: string | null
  invoice_number: string | null
  date: string | null
  amount: number | null
  currency: string | null
  tax_amount: number | null
  description: string | null
  category: string | null
}

const PROMPT = `You are an invoice and receipt data extractor for a property management company in Thailand.
Analyze the image and extract the following fields. Return ONLY a valid JSON object — no markdown, no explanation.

{
  "supplier": "Vendor or company name (string or null)",
  "invoice_number": "Invoice, receipt, or document number (string or null)",
  "date": "Date in YYYY-MM-DD format (string or null)",
  "amount": 1234.56,
  "currency": "ISO 4217 code — THB, EUR, USD, etc. (string or null)",
  "tax_amount": 123.45,
  "description": "1-2 sentence description of what was purchased (string or null)",
  "category": "Exactly one of: Rent, Legal, Staff, Utilities, Maintenance, Marketing, Operations, Other"
}

Rules:
- amount should be the total amount due/paid (number, not string)
- tax_amount is VAT or tax shown separately (number or null)
- If a field cannot be determined, use null
- For category, infer from context: electricity/water/internet = Utilities, employee wages = Staff, etc.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { base64, mimeType } = await request.json() as { base64: string; mimeType: string }
    if (!base64 || !mimeType) {
      return NextResponse.json({ ok: false, error: 'base64 and mimeType are required' }, { status: 400 })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: {
            response_mime_type: 'application/json',
            max_output_tokens: 512,
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`)
    }

    const json = await res.json()
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('Empty response from Gemini')

    const data = JSON.parse(content) as OcrResult
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR failed'
    console.error('[api/ocr]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
