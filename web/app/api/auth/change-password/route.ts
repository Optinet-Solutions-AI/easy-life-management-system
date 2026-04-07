import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { current_password, new_password } = await request.json()

  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  // Fetch stored hash
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', user.id)
    .single()

  if (error || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(current_password, dbUser.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const new_hash = await bcrypt.hash(new_password, 10)
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: new_hash })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
