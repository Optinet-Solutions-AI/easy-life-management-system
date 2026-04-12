'use client'

import { createContext, useContext } from 'react'

export type Perm = {
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
}

type PermAction = 'view' | 'add' | 'edit' | 'delete'

type PermissionsContextValue = {
  perms: Record<string, Perm>   // module → Perm
  role: string
  can: (module: string, action?: PermAction) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue>({
  perms: {},
  role: '',
  can: () => true,
})

export function PermissionsProvider({
  perms,
  role,
  children,
}: {
  perms: Record<string, Perm>
  role: string
  children: React.ReactNode
}) {
  function can(module: string, action: PermAction = 'view'): boolean {
    if (role === 'Admin') return true
    const p = perms[module]
    if (!p) return true               // no record yet → default allow
    if (action === 'view')   return p.can_view
    if (action === 'add')    return p.can_add
    if (action === 'edit')   return p.can_edit
    if (action === 'delete') return p.can_delete
    return true
  }

  return (
    <PermissionsContext.Provider value={{ perms, role, can }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
