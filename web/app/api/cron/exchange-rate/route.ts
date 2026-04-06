import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

export async function GET() {
  try {
    const res = await fetch(ECB_URL, {
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'DMS/1.0 exchange-rate-fetcher' },
    })

    if (!res.ok) throw new Error(`ECB responded ${res.status}`)

    const xml = await res.text()

    const rateMatch = xml.match(/<Cube currency="THB" rate="([^"]+)"/)
    if (!rateMatch) throw new Error('THB rate not found in ECB response')

    const rate = parseFloat(rateMatch[1])
    if (isNaN(rate) || rate <= 0) throw new Error(`Invalid rate: ${rateMatch[1]}`)

    const dateMatch = xml.match(/<Cube time="([^"]+)"/)
    const rateDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('exchange_rates')
      .upsert(
        {
          base_currency: 'EUR',
          quote_currency: 'THB',
          rate,
          source: `ECB ${rateDate}`,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'base_currency,quote_currency' }
      )

    if (error) throw new Error(`DB upsert failed: ${error.message}`)

    return NextResponse.json({ ok: true, rate, date: rateDate })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[exchange-rate refresh]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
