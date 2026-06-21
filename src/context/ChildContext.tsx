import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { childService, Child } from '../services/childService'
import { AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT, CHILDREN_CHANGED_EVENT, DATA_INVALIDATE_EVENT } from '../utils/api'
import { authService } from '../services/authService'

interface ChildContextType {
  /** All children belonging to the logged-in parent */
  children: Child[]
  /** Currently active child (the one using the AAC board) */
  activeChild: Child | null
  /** Switch the active child by ID */
  setActiveChildId: (id: string) => void
  /** True while the initial fetch is in progress */
  loading: boolean
  /** Refresh the children list from the backend */
  refresh: () => Promise<void>
}

const ChildContext = createContext<ChildContextType | undefined>(undefined)

const ACTIVE_CHILD_KEY = 'jisr_active_child_id'

export function ChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const [childList, setChildList] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshSeqRef = useRef(0)

  const clearChildren = useCallback(() => {
    setChildList([])
    setActiveChild(null)
    localStorage.removeItem(ACTIVE_CHILD_KEY)
  }, [])

  const refresh = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      clearChildren()
      setLoading(false)
      return
    }
    const seq = ++refreshSeqRef.current
    try {
      setLoading(true)
      const data = await childService.getChildren()
      if (seq !== refreshSeqRef.current) return

      const list = Array.isArray(data) ? data : []
      setChildList(list)

      const savedId = localStorage.getItem(ACTIVE_CHILD_KEY)
      const saved = savedId ? list.find((c) => c.id === savedId) : null

      if (saved) {
        setActiveChild(saved)
      } else if (list.length > 0) {
        setActiveChild(list[0])
        localStorage.setItem(ACTIVE_CHILD_KEY, list[0].id)
      } else {
        setActiveChild(null)
        localStorage.removeItem(ACTIVE_CHILD_KEY)
      }
    } catch (err) {
      if (seq !== refreshSeqRef.current) return
      console.error('ChildContext: failed to load children', err)
      setChildList([])
      setActiveChild(null)
    } finally {
      if (seq === refreshSeqRef.current) setLoading(false)
    }
  }, [clearChildren])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onChildrenChanged = () => void refresh()
    const onDataInvalidate = () => void refresh()
    const onLogout = () => {
      refreshSeqRef.current += 1
      clearChildren()
    }
    const onLogin = () => {
      refreshSeqRef.current += 1
      void refresh()
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken' || e.key === 'jisr_session_epoch') {
        void refresh()
      }
    }

    window.addEventListener(CHILDREN_CHANGED_EVENT, onChildrenChanged)
    window.addEventListener(DATA_INVALIDATE_EVENT, onDataInvalidate)
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout)
    window.addEventListener(AUTH_LOGIN_EVENT, onLogin)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHILDREN_CHANGED_EVENT, onChildrenChanged)
      window.removeEventListener(DATA_INVALIDATE_EVENT, onDataInvalidate)
      window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout)
      window.removeEventListener(AUTH_LOGIN_EVENT, onLogin)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh, clearChildren])

  const setActiveChildId = useCallback(
    (id: string) => {
      const found = childList.find((c) => c.id === id)
      if (found) {
        setActiveChild(found)
        localStorage.setItem(ACTIVE_CHILD_KEY, id)
      }
    },
    [childList]
  )

  return (
    <ChildContext.Provider
      value={{
        children: childList,
        activeChild,
        setActiveChildId,
        loading,
        refresh,
      }}
    >
      {reactChildren}
    </ChildContext.Provider>
  )
}

export function useChild(): ChildContextType {
  const ctx = useContext(ChildContext)
  if (!ctx) {
    throw new Error('useChild() must be used inside <ChildProvider>')
  }
  return ctx
}
