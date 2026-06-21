import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Wrench } from 'lucide-react'
import LandingPage from './pages/LandingPage'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import AdminLogin from './pages/admin/AdminLogin'
import Dashboard from './pages/Dashboard'
import Family from './pages/Family'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
// Child pages
import ChildAAC from './pages/child/ChildAAC'
import ChildDashboard from './pages/child/ChildDashboard'
import ChildLogin from './pages/child/ChildLogin'
// AAC pages
import AACCustomization from './pages/AACCustomization'
// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminReports from './pages/admin/AdminReports'
import AdminBlog from './pages/admin/AdminBlog'
import AdminSupport from './pages/admin/AdminSupport'
import AdminSettings from './pages/admin/AdminSettings'
import AdminBilling from './pages/admin/AdminBilling'
import AdminMedia from './pages/admin/AdminMedia'
// Admin route guard
import AdminRoute from './components/AdminRoute'
// Additional pages
import Pricing from './pages/Pricing'
import SupportTickets from './pages/SupportTickets'
import Payment from './pages/Payment'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import ForgotPassword from './pages/ForgotPassword'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Accessibility from './pages/Accessibility'
import ErrorBoundary from './components/ErrorBoundary'
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext'
import { UserPreferencesProvider } from './context/UserPreferencesContext'
import { ChildProvider } from './context/ChildContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { useAuthSessionKey } from './hooks/useAuthSessionKey'
import type { SiteSettings } from './services/adminService'

function MaintenancePage({ settings }: { settings: SiteSettings }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-surface dark:bg-ink-950 px-6">
      <div className="text-center max-w-md">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary-100 dark:bg-primary-900/30 mx-auto mb-6">
          <Wrench className="h-10 w-10 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-3xl font-bold text-ink-900 dark:text-ink-50">Under maintenance</h1>
        <p className="mt-3 text-ink-500 dark:text-ink-400">
          We're making some improvements and will be back shortly.
        </p>
        {settings.contact.email && (
          <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
            Questions? Email us at{' '}
            <a href={`mailto:${settings.contact.email}`} className="text-primary-600 dark:text-primary-400 underline">
              {settings.contact.email}
            </a>
          </p>
        )}
        <a
          href="/admin/login"
          className="mt-6 inline-block text-xs text-ink-400 dark:text-ink-600 hover:text-ink-600 dark:hover:text-ink-400 transition-colors"
        >
          Admin login
        </a>
      </div>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const { settings } = useSiteSettings()
  const { user } = useAuth()
  const sessionKey = useAuthSessionKey()

  const isAdminPath = location.pathname.startsWith('/admin')
  const isChildPath = location.pathname.startsWith('/child')

  if (settings.flags.maintenanceMode && user?.role !== 'ADMIN' && !isAdminPath && !isChildPath) {
    return <MaintenancePage settings={settings} />
  }

  // Redirect child sessions away from parent routes
  const isChildSession = localStorage.getItem('jisr_child_session') === 'true'
  const isPublicMarketing =
    location.pathname === '/' ||
    location.pathname.startsWith('/blog') ||
    location.pathname.startsWith('/pricing') ||
    location.pathname.startsWith('/signin') ||
    location.pathname.startsWith('/signup') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/privacy') ||
    location.pathname.startsWith('/terms') ||
    location.pathname.startsWith('/accessibility')
  const isParentRoute = !isAdminPath && !isChildPath && !isPublicMarketing
  if (isChildSession && isParentRoute) {
    return <Navigate to="/child/aac" replace />
  }

  return (
    <ErrorBoundary>
      <AnimatePresence>
        <Routes location={location} key={`${sessionKey}-${location.pathname}`}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/accessibility" element={<Accessibility />} />

          {/* Admin Login (public) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Parent/User Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/family" element={<Family />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/aac/customization" element={<AACCustomization />} />
          <Route path="/support" element={<SupportTickets />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/notifications" element={<SupportTickets />} />

          {/* Admin Routes — all protected by AdminRoute */}
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/blog" element={<AdminRoute><AdminBlog /></AdminRoute>} />
          <Route path="/admin/support" element={<AdminRoute><AdminSupport /></AdminRoute>} />
          <Route path="/admin/billing" element={<AdminRoute><AdminBilling /></AdminRoute>} />
          <Route path="/admin/media" element={<AdminRoute><AdminMedia /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

          {/* Child Routes */}
          <Route path="/child/login" element={<ChildLogin />} />
          <Route path="/child/dashboard" element={<Navigate to="/child/aac" replace />} />
          <Route path="/child/play" element={<ChildAAC />} />
          <Route path="/child/badges" element={<ChildAAC />} />
          <Route path="/child/stars" element={<ChildAAC />} />
          <Route path="/child/aac" element={<ChildAAC />} />
          <Route path="/child" element={<ChildAAC />} />
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <SiteSettingsProvider>
            <UserPreferencesProvider>
              <ChildProvider>
                <AppRoutes />
              </ChildProvider>
            </UserPreferencesProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  )
}

export default App
