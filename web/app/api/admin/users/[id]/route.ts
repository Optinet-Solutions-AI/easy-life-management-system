import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

async function requireAdmin() {
  const user = await getSession()
  if (!user || user.role !== 'Admin') return null
  return user
}

// PATCH /api/admin/users/[id] — reset password or update user details
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, string> = {}

  if (body.display_name) updates.display_name = body.display_name
  if (body.role) updates.role = body.role
  if (body.new_password) {
    if (body.new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    updates.password_hash = await bcrypt.hash(body.new_password, 10)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase.from('users').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users/[id] — delete a user
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Prevent admin from deleting themselves
  if (admin.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
