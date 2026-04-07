import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/')
  }

  const { data } = await supabase
    .from('users')
    .select('id, username, display_name, role, created_at')
    .order('created_at', { ascending: true })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <UsersClient initialUsers={data ?? []} currentUserId={session.id} />
    </div>
  )
}
