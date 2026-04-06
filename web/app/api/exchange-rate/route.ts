import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const FALLBACK_RATE = 37

export async function GET() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate, source, fetched_at')
    .eq('base_currency', 'EUR')
    .eq('quote_currency', 'THB')
    .single()

  if (error || !data) {
    return NextResponse.json({ rate: FALLBACK_RATE, source: 'fallback', fetched_at: null })
  }

  return NextResponse.json({
    rate: Number(data.rate),
    source: data.source,
    fetched_at: data.fetched_at,
  }, {
    headers: {
      // Cache for 1 hour on CDN edge — rate only changes once per day
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
