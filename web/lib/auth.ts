import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'dms_session'

export interface SessionUser {
  id: string
  username: string
  display_name: string
  role: string
}

export function createSessionToken(user: SessionUser): string {
  return btoa(JSON.stringify(user))
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    return JSON.parse(atob(token)) as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
