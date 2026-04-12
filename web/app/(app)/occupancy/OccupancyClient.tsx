'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Guest } from '@/types'
import PageHeader from '@/components/PageHeader'
import { useRooms } from '@/context/RoomsContext'

const COLORS = [
  'bg-blue-200 text-blue-800',
  'bg-purple-200 text-purple-800',
  'bg-green-200 text-green-800',
  'bg-orange-200 text-orange-800',
  'bg-pink-200 text-pink-800',
  'bg-teal-200 text-teal-800',
  'bg-yellow-200 text-yellow-800',
  'bg-red-200 text-red-800',
  'bg-indigo-200 text-indigo-800',
  'bg-cyan-200 text-cyan-800',
]

export default function OccupancyClient({ guests }: { guests: Guest[] }) {
  const activeRooms = useRooms().filter(r => r.active)
  const TOTAL_ROOMS = activeRooms.length || 10
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month, daysInMonth)

  const monthGuests = guests.filter(g => {
    const ci = new Date(g.check_in)
    const co = new Date(g.check_out)
    return ci <= monthEnd && co >= monthStart
  })

  // Assign a color index per guest name (stable)
  const guestColorMap: Record<string, number> = {}
  let colorIdx = 0
  monthGuests.forEach(g => {
    if (!(g.guest_name in guestColorMap)) {
      guestColorMap[g.guest_name] = colorIdx++ % COLORS.length
    }
  })

  function getGuestForDay(room: number, day: number) {
    const date = new Date(year, month, day)
    return monthGuests.find(g => {
      if (g.room !== room) return false
      const ci = new Date(g.check_in)
      const co = new Date(g.check_out)
      return ci <= date && co > date
    })
  }

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Occupancy Rate = (Room Nights Sold / Room Nights Available) × 100
  const roomNightsAvailable = TOTAL_ROOMS * daysInMonth
  const roomNightsSold = monthGuests.reduce((sum, g) => {
    const ci = new Date(g.check_in)
    const co = new Date(g.check_out)
    const start = new Date(Math.max(ci.getTime(), monthStart.getTime()))
    const end   = new Date(Math.min(co.getTime(), monthEnd.getTime()))
    const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
    return sum + nights
  }, 0)
  const occupancyRate = roomNightsAvailable > 0
    ? ((roomNightsSold / roomNightsAvailable) * 100).toFixed(1)
    : '0.0'

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <PageHeader title="Occupancy Calendar" subtitle={`${monthGuests.length} bookings this month`} />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={prev} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={18} /></button>
          <span className="text-sm sm:text-base font-semibold w-36 text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={next} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Occupancy stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-blue-700">{occupancyRate}%</p>
          <p className="text-xs font-medium text-blue-600 mt-0.5">Occupancy Rate</p>
          <p className="text-xs text-slate-400 mt-0.5">{MONTH_NAMES[month]} {year}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-800">{roomNightsSold}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Room Nights Sold</p>
          <p className="text-xs text-slate-400 mt-0.5">of {roomNightsAvailable} available</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-800">{monthGuests.length}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Bookings</p>
          <p className="text-xs text-slate-400 mt-0.5">{TOTAL_ROOMS} rooms total</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-800">{daysInMonth}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Days in Month</p>
          <p className="text-xs text-slate-400 mt-0.5">{roomNightsAvailable} total capacity</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(guestColorMap).map(([name, ci]) => (
          <span key={name} className={`text-xs font-medium px-2 py-0.5 rounded-full ${COLORS[ci]}`}>{name}</span>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
        <table className="text-xs border-collapse w-full min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2 font-semibold text-slate-600 w-20 sticky left-0 bg-slate-50">Room</th>
              {days.map(d => (
                <th key={d} className={`py-2 font-medium text-center w-8 min-w-[28px] ${
                  new Date(year, month, d).toDateString() === today.toDateString()
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-500'
                }`}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRooms.map(r => (
              <tr key={r.number} className="border-b border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-100">
                  {r.name}
                </td>
                {days.map(d => {
                  const guest = getGuestForDay(r.number, d)
                  const date = new Date(year, month, d)
                  const isCheckIn = guest && new Date(guest.check_in).toDateString() === date.toDateString()
                  const isCheckOut = guest && new Date(guest.check_out).toDateString() === new Date(year, month, d + 1).toDateString()
                  return (
                    <td key={d} className={`h-9 ${guest ? COLORS[guestColorMap[guest.guest_name]] : 'bg-white'} ${
                      isCheckIn ? 'rounded-l-md' : ''
                    } ${isCheckOut ? 'rounded-r-md' : ''} border border-slate-100`}>
                      {isCheckIn && (
                        <span className="px-1 truncate text-xs font-medium">{guest!.guest_name.split(' ')[0]}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status legend */}
      <div className="flex gap-4 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Today</span>
        <span>Cells show guest stay duration. Name appears on check-in day.</span>
      </div>
    </>
  )
}
