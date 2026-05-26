import { api } from '../utils/api'
import { API_ENDPOINTS } from '../config/api'

/* ------------------------------ Types ----------------------------------- */

export type UserRole = 'USER' | 'ADMIN'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  accountType?: string | null
  emailVerified?: boolean
  blocked?: boolean
  restrictions?: string[]
  createdAt: string
  _count?: { children: number }
}

export interface MediaAsset {
  id: string
  filename: string
  originalName: string
  url: string
  mimeType: string
  size: number
  category: string
  tags: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export const MEDIA_CATEGORIES = [
  'general', 'emotions', 'people', 'places', 'food',
  'activities', 'objects', 'animals', 'nature', 'school',
  'symbols', 'photos', 'icons', 'gifs',
] as const
export type MediaCategory = typeof MEDIA_CATEGORIES[number]

export const RESTRICTION_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: 'children', label: 'Manage children', description: 'Block adding or managing child profiles' },
  { key: 'vocabulary', label: 'Edit vocabulary', description: 'Block creating or editing vocabulary cards' },
  { key: 'support', label: 'Support tickets', description: 'Block opening new support tickets' },
  { key: 'payments', label: 'Payments', description: 'Block making subscription payments' },
]

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PlatformStats {
  totalUsers: number
  totalChildren: number
  totalVocabulary: number
  totalOrders: number
  totalPayments: number
  activeUsers: number
  pendingTickets: number
  publishedPosts: number
  revenue: number
}

export interface PlatformAnalytics extends PlatformStats {
  recentUsers: AdminUser[]
  recentOrders: any[]
  usersByRole: { role: UserRole; count: number }[]
  ordersByStatus: { status: string; count: number }[]
  monthlyTrend: { month: string; value: number }[]
}

export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface BlogPost {
  id: string
  slug: string
  title: string
  titleAr?: string | null
  excerpt: string
  excerptAr?: string | null
  content: string
  contentAr?: string | null
  category: string
  status: BlogStatus
  featured: boolean
  showOnHomepage: boolean
  emoji?: string | null
  coverImageUrl?: string | null
  authorName: string
  views: number
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface SiteFeature {
  icon: string
  title: string
  titleAr?: string
  description: string
  descriptionAr?: string
}

export interface SiteReview {
  id?: string
  name: string
  nameAr?: string | null
  role: string
  roleAr?: string | null
  quote: string
  quoteAr?: string | null
  active?: boolean
  order?: number
}

export interface SiteSettings {
  branding: {
    siteName: string
    siteNameAr?: string
    tagline: string
    taglineAr?: string
    logoUrl?: string
    primaryColor: string
    accentColor: string
  }
  hero: {
    eyebrow: string
    eyebrowAr?: string
    title: string
    titleAr?: string
    subtitle: string
    subtitleAr?: string
    primaryCtaLabel: string
    primaryCtaLabelAr?: string
    primaryCtaHref: string
    secondaryCtaLabel: string
    secondaryCtaLabelAr?: string
    secondaryCtaHref: string
    backgroundImageUrl?: string
  }
  features: SiteFeature[]
  contact: {
    email: string
    phone: string
    address: string
    twitter?: string
    instagram?: string
    facebook?: string
    linkedin?: string
  }
  seo: {
    metaTitle: string
    metaDescription: string
    ogImageUrl?: string
  }
  flags: {
    maintenanceMode: boolean
    showPricing: boolean
    showBlog: boolean
    enableSignups: boolean
  }
}

export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface AdminTicketSummary {
  id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  category: string
  description: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
  _count?: { messages: number }
}

export interface TicketMessage {
  id: string
  message: string
  isFromUser: boolean
  createdAt: string
}

export interface AdminTicketDetail extends AdminTicketSummary {
  messages: TicketMessage[]
}

/* ----------------------------- Service ---------------------------------- */

const buildQuery = (params: Record<string, any>) => {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    usp.append(k, String(v))
  })
  const q = usp.toString()
  return q ? `?${q}` : ''
}

class AdminService {
  /* Stats */
  async getStats(): Promise<PlatformStats> {
    const r = await api.get<PlatformStats>(API_ENDPOINTS.ADMIN.STATS)
    if (!r.data) throw new Error('Failed to load stats')
    return r.data
  }

  async getAnalytics(): Promise<PlatformAnalytics> {
    const r = await api.get<PlatformAnalytics>(API_ENDPOINTS.ADMIN.ANALYTICS)
    if (!r.data) throw new Error('Failed to load analytics')
    return r.data
  }

  /* Users */
  async listUsers(params: {
    search?: string
    role?: string
    page?: number
    limit?: number
  } = {}): Promise<PaginatedResult<AdminUser>> {
    const r = await api.get<PaginatedResult<AdminUser>>(
      `${API_ENDPOINTS.ADMIN.USERS}${buildQuery(params)}`
    )
    if (!r.data) throw new Error('Failed to load users')
    return r.data
  }

  async createUser(payload: {
    name: string
    email: string
    password?: string
    role?: UserRole
    accountType?: string
  }): Promise<AdminUser> {
    const r = await api.post<AdminUser>(API_ENDPOINTS.ADMIN.USERS, payload)
    if (!r.data) throw new Error('Failed to create user')
    return r.data
  }

  async updateUser(id: string, payload: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
    const r = await api.put<AdminUser>(API_ENDPOINTS.ADMIN.USER(id), payload)
    if (!r.data) throw new Error('Failed to update user')
    return r.data
  }

  async deleteUser(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.ADMIN.USER(id))
  }

  async blockUser(id: string): Promise<AdminUser> {
    const r = await api.put<AdminUser>(API_ENDPOINTS.ADMIN.BLOCK_USER(id))
    if (!r.data) throw new Error('Failed to block user')
    return r.data
  }

  async unblockUser(id: string): Promise<AdminUser> {
    const r = await api.put<AdminUser>(API_ENDPOINTS.ADMIN.UNBLOCK_USER(id))
    if (!r.data) throw new Error('Failed to unblock user')
    return r.data
  }

  async setUserRestrictions(id: string, restrictions: string[]): Promise<AdminUser> {
    const r = await api.put<AdminUser>(API_ENDPOINTS.ADMIN.USER_RESTRICTIONS(id), { restrictions })
    if (!r.data) throw new Error('Failed to update restrictions')
    return r.data
  }

  /* Plans */
  async listPlans() {
    const r = await api.get<any[]>(API_ENDPOINTS.ADMIN.PLANS)
    return r.data ?? []
  }
  async createPlan(payload: any) {
    const r = await api.post<any>(API_ENDPOINTS.ADMIN.PLANS, payload)
    return r.data
  }
  async updatePlan(id: string, payload: any) {
    const r = await api.put<any>(API_ENDPOINTS.ADMIN.PLAN(id), payload)
    return r.data
  }
  async deletePlan(id: string) {
    await api.delete(API_ENDPOINTS.ADMIN.PLAN(id))
  }

  /* Discounts */
  async listDiscounts() {
    const r = await api.get<any[]>(API_ENDPOINTS.ADMIN.DISCOUNTS)
    return r.data ?? []
  }
  async createDiscount(payload: any) {
    const r = await api.post<any>(API_ENDPOINTS.ADMIN.DISCOUNTS, payload)
    return r.data
  }
  async updateDiscount(id: string, payload: any) {
    const r = await api.put<any>(API_ENDPOINTS.ADMIN.DISCOUNT(id), payload)
    return r.data
  }
  async deleteDiscount(id: string) {
    await api.delete(API_ENDPOINTS.ADMIN.DISCOUNT(id))
  }

  /* Blog */
  async listBlogPosts(params: {
    search?: string
    status?: string
    page?: number
    limit?: number
  } = {}): Promise<PaginatedResult<BlogPost>> {
    const r = await api.get<PaginatedResult<BlogPost>>(
      `${API_ENDPOINTS.ADMIN.BLOG}${buildQuery(params)}`
    )
    if (!r.data) throw new Error('Failed to load posts')
    return r.data
  }
  async createBlogPost(payload: Partial<BlogPost>): Promise<BlogPost> {
    const r = await api.post<BlogPost>(API_ENDPOINTS.ADMIN.BLOG, payload)
    if (!r.data) throw new Error('Failed to create post')
    return r.data
  }
  async updateBlogPost(id: string, payload: Partial<BlogPost>): Promise<BlogPost> {
    const r = await api.put<BlogPost>(API_ENDPOINTS.ADMIN.BLOG_ITEM(id), payload)
    if (!r.data) throw new Error('Failed to update post')
    return r.data
  }
  async deleteBlogPost(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.ADMIN.BLOG_ITEM(id))
  }

  /* Settings */
  async getSettings(): Promise<SiteSettings> {
    const r = await api.get<SiteSettings>(API_ENDPOINTS.ADMIN.SETTINGS)
    if (!r.data) throw new Error('Failed to load settings')
    return r.data
  }
  async updateSettings(payload: Partial<SiteSettings>): Promise<SiteSettings> {
    const r = await api.put<SiteSettings>(API_ENDPOINTS.ADMIN.SETTINGS, payload)
    if (!r.data) throw new Error('Failed to update settings')
    return r.data
  }

  /* Tickets */
  async listTickets(params: {
    search?: string
    status?: string
    priority?: string
    page?: number
    limit?: number
  } = {}): Promise<PaginatedResult<AdminTicketSummary>> {
    const r = await api.get<PaginatedResult<AdminTicketSummary>>(
      `${API_ENDPOINTS.ADMIN.TICKETS}${buildQuery(params)}`
    )
    if (!r.data) throw new Error('Failed to load tickets')
    return r.data
  }
  async getTicket(id: string): Promise<AdminTicketDetail> {
    const r = await api.get<AdminTicketDetail>(API_ENDPOINTS.ADMIN.TICKET(id))
    if (!r.data) throw new Error('Failed to load ticket')
    return r.data
  }
  async updateTicket(id: string, payload: Partial<AdminTicketSummary>): Promise<AdminTicketSummary> {
    const r = await api.put<AdminTicketSummary>(API_ENDPOINTS.ADMIN.TICKET(id), payload)
    if (!r.data) throw new Error('Failed to update ticket')
    return r.data
  }
  async replyToTicket(id: string, message: string): Promise<AdminTicketDetail> {
    const r = await api.post<AdminTicketDetail>(API_ENDPOINTS.ADMIN.TICKET_REPLY(id), { message })
    if (!r.data) throw new Error('Failed to send reply')
    return r.data
  }

  /* Media */
  async listMedia(params: { search?: string; category?: string; active?: boolean } = {}): Promise<MediaAsset[]> {
    const usp = new URLSearchParams()
    if (params.search) usp.append('search', params.search)
    if (params.category) usp.append('category', params.category)
    if (params.active !== undefined) usp.append('active', String(params.active))
    const q = usp.toString()
    const r = await api.get<MediaAsset[]>(`${API_ENDPOINTS.ADMIN.MEDIA}${q ? `?${q}` : ''}`)
    return r.data ?? []
  }

  async uploadMedia(formData: FormData): Promise<MediaAsset> {
    const { getApiUrl } = await import('../config/api')
    const token = localStorage.getItem('accessToken')
    const res = await fetch(getApiUrl(API_ENDPOINTS.ADMIN.MEDIA), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.message || 'Upload failed')
    return json.data
  }

  async updateMedia(id: string, payload: { category?: string; tags?: string[]; active?: boolean; originalName?: string }): Promise<MediaAsset> {
    const r = await api.put<MediaAsset>(API_ENDPOINTS.ADMIN.MEDIA_ITEM(id), payload)
    if (!r.data) throw new Error('Failed to update asset')
    return r.data
  }

  async deleteMedia(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.ADMIN.MEDIA_ITEM(id))
  }

  /* Children */
  async listChildren(params: { search?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<any>> {
    const r = await api.get<PaginatedResult<any>>(
      `${API_ENDPOINTS.ADMIN.CHILDREN}${buildQuery(params)}`
    )
    if (!r.data) throw new Error('Failed to load children')
    return r.data
  }

  async updateChild(id: string, payload: { name?: string; username?: string; age?: number | null; pin?: string }): Promise<any> {
    const r = await api.put<any>(API_ENDPOINTS.ADMIN.CHILD(id), payload)
    if (!r.data) throw new Error('Failed to update child')
    return r.data
  }

  /* Reviews */
  async listReviews(): Promise<SiteReview[]> {
    const r = await api.get<SiteReview[]>(API_ENDPOINTS.ADMIN.REVIEWS)
    return r.data ?? []
  }
  async createReview(payload: Omit<SiteReview, 'id'>): Promise<SiteReview & { id: string }> {
    const r = await api.post<SiteReview & { id: string }>(API_ENDPOINTS.ADMIN.REVIEWS, payload)
    if (!r.data) throw new Error('Failed to create review')
    return r.data
  }
  async updateReview(id: string, payload: Partial<SiteReview>): Promise<SiteReview & { id: string }> {
    const r = await api.put<SiteReview & { id: string }>(API_ENDPOINTS.ADMIN.REVIEW(id), payload)
    if (!r.data) throw new Error('Failed to update review')
    return r.data
  }
  async deleteReview(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.ADMIN.REVIEW(id))
  }
}

export const adminService = new AdminService()

/* ----------------------- Admin child type/methods ----------------------- */
export interface AdminChild {
  id: string
  name: string
  username: string | null
  age: number | null
  userId: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
}

/* --------------------- Public site settings (cached) -------------------- */

export const publicMediaService = {
  async listMedia(params: { search?: string; category?: string } = {}): Promise<MediaAsset[]> {
    const usp = new URLSearchParams()
    if (params.search) usp.append('search', params.search)
    if (params.category && params.category !== 'all') usp.append('category', params.category)
    const q = usp.toString()
    const r = await api.get<MediaAsset[]>(`${API_ENDPOINTS.PUBLIC.MEDIA}${q ? `?${q}` : ''}`, { requireAuth: false })
    return r.data ?? []
  },
}

export const publicSiteService = {
  async getSettings(): Promise<SiteSettings> {
    const r = await api.get<SiteSettings>(API_ENDPOINTS.PUBLIC.SETTINGS, { requireAuth: false })
    if (!r.data) throw new Error('Failed to load site settings')
    return r.data
  },
  async listBlogPosts(): Promise<BlogPost[]> {
    const r = await api.get<BlogPost[]>(API_ENDPOINTS.PUBLIC.BLOG, { requireAuth: false })
    return r.data ?? []
  },
  async getBlogPost(slug: string): Promise<BlogPost> {
    const r = await api.get<BlogPost>(API_ENDPOINTS.PUBLIC.BLOG_ITEM(slug), { requireAuth: false })
    if (!r.data) throw new Error('Post not found')
    return r.data
  },
  async listPlans(): Promise<any[]> {
    const r = await api.get<any[]>(API_ENDPOINTS.PUBLIC.PLANS, { requireAuth: false })
    return r.data ?? []
  },
}

export const publicReviewService = {
  async listReviews(): Promise<(SiteReview & { id: string })[]> {
    const r = await api.get<(SiteReview & { id: string })[]>(API_ENDPOINTS.PUBLIC.REVIEWS, { requireAuth: false })
    return r.data ?? []
  },
}
