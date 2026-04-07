import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

async function requireAdmin() {
  const user = await getSession()
  if (!user) return null
  if (user.role !== 'admin') return null
  return user
}

// GET /api/admin/users — list all users
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// POST /api/admin/users — create a new user
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { username, display_name, role, password } = await request.json()

  if (!username || !display_name || !role || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('users')
    .insert({ username, display_name, role, password_hash })
    .select('id, username, display_name, role, created_at')
    .single()

  if (error) {
    const msg = error.message.includes('unique') ? 'Username already exists' : 'Failed to create user'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ ok: true, data })
}
