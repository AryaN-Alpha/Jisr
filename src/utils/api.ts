import { getApiUrl } from '../config/api'

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error'
  message?: string
  data?: T
  error?: string
  details?: Array<{field: string, message: string}> | any
}

export class ApiError extends Error {
  details?: Array<{field: string, message: string}> | any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
  }
}

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const SESSION_EPOCH_KEY = 'jisr_session_epoch'

export const AUTH_LOGIN_EVENT = 'jisr:auth-login'
export const AUTH_LOGOUT_EVENT = 'jisr:auth-logout'
export const CHILDREN_CHANGED_EVENT = 'jisr:children-changed'
/** Fired when auth session changes — all data views should reload. */
export const DATA_INVALIDATE_EVENT = 'jisr:data-invalidate'

const PUBLIC_ROUTES = new Set([
  '/',
  '/signin',
  '/signup',
  '/forgot-password',
  '/blog',
  '/pricing',
  '/admin/login',
])

const isBrowser = typeof window !== 'undefined'

const getSessionEpoch = (): number => {
  if (!isBrowser) return 0
  const stored = window.localStorage.getItem(SESSION_EPOCH_KEY)
  return stored ? parseInt(stored, 10) : 0
}

const bumpSessionEpoch = (): void => {
  if (!isBrowser) return
  window.localStorage.setItem(SESSION_EPOCH_KEY, String(Date.now()))
}

export const notifyChildrenChanged = (): void => {
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent(CHILDREN_CHANGED_EVENT))
  window.dispatchEvent(new CustomEvent(DATA_INVALIDATE_EVENT))
}

const getAuthToken = (): string | null =>
  isBrowser ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null

export const saveTokens = (accessToken: string, refreshToken: string): void => {
  if (!isBrowser) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

/** Persist tokens and notify all contexts/pages that a new session is active. */
export const establishAuthSession = (accessToken: string, refreshToken: string): void => {
  saveTokens(accessToken, refreshToken)
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT))
  window.dispatchEvent(new CustomEvent(DATA_INVALIDATE_EVENT))
}

export const clearTokens = (): void => {
  if (!isBrowser) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem('jisr_child_session')
  window.localStorage.removeItem('jisr_active_child_id')
  bumpSessionEpoch()
  refreshInFlight = null
}

/** Clear stored credentials and notify React contexts to drop in-memory user state. */
export const resetAuthSession = (): void => {
  clearTokens()
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
  window.dispatchEvent(new CustomEvent(DATA_INVALIDATE_EVENT))
}

const redirectToSignIn = () => {
  if (!isBrowser) return
  const path = window.location.pathname
  if (PUBLIC_ROUTES.has(path)) return
  if (path.startsWith('/admin')) {
    window.location.href = '/admin/login'
  } else {
    window.location.href = '/signin'
  }
}

let refreshInFlight: Promise<string | null> | null = null

const runRefreshAccessToken = async (epochAtStart: number): Promise<string | null> => {
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null

  try {
    const response = await fetch(getApiUrl('auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })
    if (!response.ok) {
      clearTokens()
      return null
    }
    const data: ApiResponse<{ accessToken: string }> = await response.json()
    if (getSessionEpoch() !== epochAtStart) {
      return null
    }
    if (data.status === 'success' && data.data?.accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken)
      return data.data.accessToken
    }
    clearTokens()
    return null
  } catch (err) {
    console.error('Failed to refresh access token:', err)
    clearTokens()
    return null
  }
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (!isBrowser) return null
  const epochAtStart = getSessionEpoch()

  if (refreshInFlight) {
    await refreshInFlight
    if (getSessionEpoch() !== epochAtStart) {
      return refreshAccessToken()
    }
    return getAuthToken()
  }

  refreshInFlight = runRefreshAccessToken(epochAtStart)
  try {
    const token = await refreshInFlight
    if (getSessionEpoch() !== epochAtStart) {
      return refreshAccessToken()
    }
    return token
  } finally {
    refreshInFlight = null
  }
}

interface RequestOptions extends RequestInit {
  requireAuth?: boolean
  signal?: AbortSignal
}

export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { requireAuth = true, headers, ...rest } = options

  const buildHeaders = (overrideToken?: string | null) => {
    const merged: Record<string, string> = { 'Content-Type': 'application/json' }
    if (headers) Object.assign(merged, headers as Record<string, string>)
    if (requireAuth) {
      const token = overrideToken ?? getAuthToken()
      if (token) merged.Authorization = `Bearer ${token}`
    }
    return merged
  }

  const method = (rest.method ?? 'GET').toUpperCase()
  const baseUrl = getApiUrl(endpoint)
  const url =
    method === 'GET'
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`
      : baseUrl

  const doFetch = async (overrideToken?: string | null) =>
    fetch(url, { ...rest, cache: 'no-store', headers: buildHeaders(overrideToken) })

  try {
    let token = getAuthToken()
    // If we need auth but have no token, try to refresh proactively
    if (requireAuth && !token) {
      token = await refreshAccessToken()
    }

    let response = await doFetch(token)

    if (response.status === 401 && requireAuth) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        response = await doFetch(newToken)
      } else {
        clearTokens()
        redirectToSignIn()
        throw new Error('Your session has expired. Please sign in again.')
      }
    }

    let data: ApiResponse<T> | null = null
    try {
      data = (await response.json()) as ApiResponse<T>
    } catch {
      data = null
    }

    if (!response.ok) {
      throw new ApiError(
        data?.message || data?.error || `Request failed with status ${response.status}`,
        data?.details
      )
    }

    return (
      data ?? ({ status: 'success', data: undefined as unknown as T } as ApiResponse<T>)
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    console.error('API request error:', error)
    throw error
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}
