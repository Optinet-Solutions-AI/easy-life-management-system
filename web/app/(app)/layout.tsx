import Sidebar from '@/components/Sidebar'
import { getSession } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  return (
    <div className="h-full bg-slate-50 text-slate-900 antialiased lg:flex">
      <Sidebar user={user ?? undefined} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
