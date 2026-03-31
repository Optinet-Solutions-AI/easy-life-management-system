'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  TrendingUp,
  Landmark,
  Briefcase,
  CheckSquare,
  PieChart,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/occupancy', label: 'Occupancy', icon: CalendarDays },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/founding', label: 'Founding', icon: Landmark },
  { href: '/shareholder-work', label: 'Shareholder Work', icon: Briefcase },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/budget', label: 'Budget', icon: PieChart },
]

function NavLinks({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {active && <ChevronRight size={14} />}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarHeader() {
  return (
    <div className="px-5 py-5 border-b border-slate-700 shrink-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Easy Life</p>
      <h1 className="text-base font-bold text-white mt-0.5">Management Board</h1>
    </div>
  )
}

function SidebarFooter() {
  return (
    <div className="px-5 py-4 border-t border-slate-700 shrink-0">
      <p className="text-xs text-slate-500">DreamT-CO © 2026</p>
    </div>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900 flex items-center px-4 gap-3 border-b border-slate-700">
        <button onClick={() => setOpen(true)} className="text-slate-300 hover:text-white p-1">
          <Menu size={22} />
        </button>
        <div>
          <p className="text-xs text-slate-400 leading-none">Easy Life</p>
          <p className="text-sm font-bold text-white leading-tight">Management Board</p>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 text-slate-100 flex flex-col transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Easy Life</p>
            <h1 className="text-base font-bold text-white mt-0.5">Management Board</h1>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <NavLinks onNav={() => setOpen(false)} />
        <SidebarFooter />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-slate-900 text-slate-100 flex-col h-full">
        <SidebarHeader />
        <NavLinks />
        <SidebarFooter />
      </aside>
    </>
  )
}
