import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
  'image/avif',
  'application/pdf',
])

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    // Normalise MIME type — some browsers report HEIC differently
    const mimeType = file.type || 'application/octet-stream'
    const isImage = mimeType.startsWith('image/')
    if (!isImage && !ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: `File type "${mimeType}" is not supported. Upload a JPEG, PNG, WEBP, HEIC, PDF, or other image format.` },
        { status: 400 }
      )
    }

    // Use service role key if configured (bypasses RLS), otherwise fall back to anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const client = createClient(supabaseUrl, key)

    // Build a unique storage path
    const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin'
    const path = `expenses/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await client.storage
      .from('dms-files')
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      // Surface a clear Supabase storage error
      throw new Error(error.message)
    }

    const { data: { publicUrl } } = client.storage.from('dms-files').getPublicUrl(data.path)

    return NextResponse.json({ ok: true, url: publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[api/upload]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
