'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
  BarChart3,
  Gauge,
  UserCircle2,
  CalendarRange,
  Clock,
  RotateCcw,
  Scale,
  Settings,
  MessageSquareWarning,
} from 'lucide-react'
import { useCurrency } from '@/context/CurrencyContext'
import type { SessionUser } from '@/lib/auth'

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/shareholder-dashboard', label: 'Shareholder', icon: BarChart3 },
  { href: '/operations-dashboard', label: 'GM Dashboard', icon: Gauge },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/occupancy', label: 'Occupancy', icon: CalendarDays },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/founding', label: 'Founding', icon: Landmark },
  { href: '/shareholder-work', label: 'Shareholder Work', icon: Briefcase },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/budget', label: 'Budget', icon: PieChart },
  { href: '/shareholder-profiles', label: 'SH Profiles', icon: UserCircle2 },
  { href: '/shareholder-meetings', label: 'SH Meetings', icon: CalendarRange },
  { href: '/staff-hours', label: 'Staff Hours', icon: Clock },
  { href: '/legal', label: 'Legal', icon: Scale },
  { href: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/settings', label: 'Admin Settings', icon: Settings },
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
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Dream-T</p>
      <h1 className="text-base font-bold text-white mt-0.5">Management System</h1>
    </div>
  )
}

function CurrencyToggle() {
  const { currency, toggle, rate, rateSource, rateFetchedAt, refreshRate, refreshing } = useCurrency()
  const isLive = rateSource && rateSource !== 'fallback' && rateSource !== 'seed'

  const lastChecked = rateFetchedAt
    ? new Date(rateFetchedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-1.5">
      <button
        onClick={toggle}
        className="flex w-full items-center bg-slate-800 hover:bg-slate-700 rounded-lg p-1 text-xs font-medium transition-colors"
        title={`Toggle currency — 1 EUR = ${rate.toFixed(2)} THB`}
      >
        <span className={`flex-1 text-center py-1 rounded-md transition-colors ${currency === 'THB' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
          ฿ THB
        </span>
        <span className={`flex-1 text-center py-1 rounded-md transition-colors ${currency === 'EUR' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
          € EUR
        </span>
      </button>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs text-slate-600">
          1 EUR = <span className="text-slate-400">{rate.toFixed(2)} THB</span>
          {isLive && <span className="ml-1 text-green-600 text-[10px]">●</span>}
        </span>
        <div className="flex items-center gap-1">
          {lastChecked && (
            <span className="text-[10px] text-slate-600">{lastChecked}</span>
          )}
          <button
            onClick={refreshRate}
            disabled={refreshing}
            title="Refresh exchange rate from ECB"
            className="text-slate-500 hover:text-blue-400 disabled:opacity-40 transition-colors p-0.5"
          >
            <RotateCcw size={11} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}

function UserFooter({ user }: { user?: SessionUser }) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="px-3 py-4 border-t border-slate-700 shrink-0 space-y-3">
      <CurrencyToggle />
      {user && (
        <div className="flex items-center justify-between px-1">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user.display_name}</p>
            <p className="text-xs text-slate-500 truncate">{user.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="ml-2 shrink-0 text-slate-500 hover:text-red-400 transition-colors p-1"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
      <p className="text-xs text-slate-600 px-1">Dream-T © 2026</p>
    </div>
  )
}

export default function Sidebar({ user }: { user?: SessionUser }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { currency, toggle } = useCurrency()
  const router = useRouter()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900 flex items-center px-4 gap-3 border-b border-slate-700">
        <button onClick={() => setOpen(true)} className="text-slate-300 hover:text-white p-1">
          <Menu size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 leading-none">Dream-T</p>
          <p className="text-sm font-bold text-white leading-tight truncate">DMS</p>
        </div>
        <button
          onClick={toggle}
          className="shrink-0 flex items-center bg-slate-700 border border-slate-500 rounded-lg p-0.5 text-xs font-medium"
        >
          <span className={`px-2.5 py-1 rounded-md transition-colors ${currency === 'THB' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>฿</span>
          <span className={`px-2.5 py-1 rounded-md transition-colors ${currency === 'EUR' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>€</span>
        </button>
        {user && (
          <button onClick={logout} title="Sign out" className="shrink-0 text-slate-400 hover:text-red-400 transition-colors p-1">
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 text-slate-100 flex flex-col transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Dream-T</p>
            <h1 className="text-base font-bold text-white mt-0.5">Management System</h1>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <NavLinks onNav={() => setOpen(false)} />
        <UserFooter user={user} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-slate-900 text-slate-100 flex-col h-full">
        <SidebarHeader />
        <NavLinks />
        <UserFooter user={user} />
      </aside>
    </>
  )
}
