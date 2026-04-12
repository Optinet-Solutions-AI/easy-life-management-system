'use client'

import { createContext, useContext } from 'react'

export type Room = { id: string; number: number; name: string; active: boolean }

const RoomsContext = createContext<Room[]>([])

export function RoomsProvider({ rooms, children }: { rooms: Room[]; children: React.ReactNode }) {
  return <RoomsContext.Provider value={rooms}>{children}</RoomsContext.Provider>
}

export function useRooms() {
  return useContext(RoomsContext)
}
