import Sidebar from '@/components/Sidebar'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { PermissionsProvider, type Perm } from '@/context/PermissionsContext'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  // Fetch the current user's module permissions (skip for Admin — they always have full access)
  const permsMap: Record<string, Perm> = {}
  if (user && user.role !== 'Admin') {
    const { data } = await supabase
      .from('role_permissions')
      .select('module, can_view, can_add, can_edit, can_delete')
      .eq('role', user.role)
    for (const row of data ?? []) {
      permsMap[row.module] = {
        can_view:   row.can_view,
        can_add:    row.can_add,
        can_edit:   row.can_edit,
        can_delete: row.can_delete,
      }
    }
  }

  return (
    <PermissionsProvider perms={permsMap} role={user?.role ?? ''}>
      <div className="h-full bg-slate-50 text-slate-900 antialiased lg:flex">
        <Sidebar user={user ?? undefined} />
        <main className="flex-1 overflow-auto pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </PermissionsProvider>
  )
}
