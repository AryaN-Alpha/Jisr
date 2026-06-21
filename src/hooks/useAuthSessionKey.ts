import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  AUTH_LOGIN_EVENT,
  AUTH_LOGOUT_EVENT,
  DATA_INVALIDATE_EVENT,
} from '../utils/api'

/**
 * Stable key that changes whenever the authenticated user or session type changes.
 * Use as part of React Router `key` to remount pages and drop stale in-memory data.
 */
export function useAuthSessionKey(): string {
  const { user } = useAuth()
  const [childSession, setChildSession] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem('jisr_child_session') === 'true'
  )

  useEffect(() => {
    const sync = () => {
      setChildSession(window.localStorage.getItem('jisr_child_session') === 'true')
    }
    window.addEventListener(AUTH_LOGIN_EVENT, sync)
    window.addEventListener(AUTH_LOGOUT_EVENT, sync)
    window.addEventListener(DATA_INVALIDATE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_LOGIN_EVENT, sync)
      window.removeEventListener(AUTH_LOGOUT_EVENT, sync)
      window.removeEventListener(DATA_INVALIDATE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const epoch =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('jisr_session_epoch') ?? '0'
      : '0'

  return `${user?.id ?? 'logged-out'}-${childSession ? 'child' : 'parent'}-${epoch}`
}
