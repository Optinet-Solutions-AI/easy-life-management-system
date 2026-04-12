import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getSession()
  const isAdmin = session?.role === 'Admin'

  let users: { id: string; username: string; display_name: string; role: string; created_at: string }[] = []
  let permissions: { role: string; module: string; can_view: boolean; can_add: boolean; can_edit: boolean; can_delete: boolean }[] = []

  if (isAdmin) {
    const [usersRes, permsRes] = await Promise.all([
      supabase.from('users').select('id, username, display_name, role, created_at').order('created_at', { ascending: true }),
      supabase.from('role_permissions').select('role, module, can_view, can_add, can_edit, can_delete'),
    ])
    users       = usersRes.data ?? []
    permissions = permsRes.data ?? []
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <SettingsClient
        isAdmin={isAdmin}
        currentUserId={session?.id ?? ''}
        initialUsers={users}
        initialPermissions={permissions}
      />
    </div>
  )
}
