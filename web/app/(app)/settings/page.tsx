import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getSession()
  const isAdmin = session?.role === 'Admin'

  let users: { id: string; username: string; display_name: string; role: string; created_at: string }[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, role, created_at')
      .order('created_at', { ascending: true })
    users = data ?? []
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <SettingsClient
        isAdmin={isAdmin}
        currentUserId={session?.id ?? ''}
        initialUsers={users}
      />
    </div>
  )
}
