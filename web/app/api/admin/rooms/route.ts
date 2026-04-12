import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (session?.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function GET() {
  const { data, error } = await supabase.from('rooms').select('*').order('number')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny
  const body = await req.json()
  const { data, error } = await supabase
    .from('rooms')
    .insert({ number: Number(body.number), name: String(body.name).trim(), active: true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny
  const { id, name, active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = String(name).trim()
  if (active !== undefined) updates.active = Boolean(active)
  const { data, error } = await supabase.from('rooms').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const deny = await requireAdmin(); if (deny) return deny
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
