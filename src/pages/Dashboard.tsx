import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  MessageSquare,
  BarChart3,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Activity as ActivityIcon,
  ArrowRight,
  TrendingUp,
  Volume2,
  Flame,
  Sparkles,
  Calendar,
  Baby,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import Skeleton from '../components/Skeleton'
import {
  dashboardService,
  DashboardStats,
  Notification,
  Activity as ActivityLog,
} from '../services/dashboardService'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { tr, t } from '../i18n/translations'
import { AUTH_LOGIN_EVENT, CHILDREN_CHANGED_EVENT, DATA_INVALIDATE_EVENT } from '../utils/api'

const EMPTY_STATS: DashboardStats = {
  totalCards: 0,
  sentencesToday: 0,
  mostUsedCard: 'None',
  communicationStreak: 0,
  totalChildren: 0,
}

/* Tone maps include both light and dark mode classes */
const tones = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:ring-primary-800',
  accent: 'bg-accent-50 text-accent-700 ring-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:ring-accent-800',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
  sunny: 'bg-sunny-50 text-sunny-800 ring-sunny-100 dark:bg-sunny-900/30 dark:text-sunny-300 dark:ring-sunny-800',
}

// Bilingual quick tips
const QUICK_TIPS = {
  en: [
    { step: 1, title: 'Add common words first', desc: 'Start with what your child needs most: water, food, help.' },
    { step: 2, title: 'Use categories', desc: 'Organize by needs, feelings, and actions for easier scanning.' },
    { step: 3, title: 'Review analytics weekly', desc: 'Look at top words to guide vocabulary expansion.' },
  ],
  ar: [
    { step: 1, title: 'ابدأ بالكلمات الشائعة', desc: 'ابدأ بما يحتاجه طفلك أكثر: الماء والطعام والمساعدة.' },
    { step: 2, title: 'استخدم التصنيفات', desc: 'نظّم حسب الاحتياجات والمشاعر والأفعال لتسهيل التصفح.' },
    { step: 3, title: 'راجع التحليلات أسبوعياً', desc: 'راقب أكثر الكلمات استخداماً لتوجيه توسعة المفردات.' },
  ],
}

export default function Dashboard() {
  const { language, isArabic } = useLanguage()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const loadSeqRef = useRef(0)

  useEffect(() => {
    if (!user) {
      loadSeqRef.current += 1
      setStats(EMPTY_STATS)
      setNotifications([])
      setActivity([])
      setUnread(0)
      setLoading(false)
      return
    }

    const load = async () => {
      const seq = ++loadSeqRef.current
      try {
        setLoading(true)
        const [s, n, a, u] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getNotifications(true, 10),
          dashboardService.getRecentActivity(5),
          dashboardService.getUnreadCount(),
        ])
        if (seq !== loadSeqRef.current) return
        setStats(s)
        setNotifications(n)
        setActivity(a)
        setUnread(u)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        if (seq === loadSeqRef.current) setLoading(false)
      }
    }

    void load()
    const onInvalidate = () => void load()
    window.addEventListener(CHILDREN_CHANGED_EVENT, onInvalidate)
    window.addEventListener(AUTH_LOGIN_EVENT, onInvalidate)
    window.addEventListener(DATA_INVALIDATE_EVENT, onInvalidate)
    window.addEventListener('focus', onInvalidate)
    return () => {
      loadSeqRef.current += 1
      window.removeEventListener(CHILDREN_CHANGED_EVENT, onInvalidate)
      window.removeEventListener(AUTH_LOGIN_EVENT, onInvalidate)
      window.removeEventListener(DATA_INVALIDATE_EVENT, onInvalidate)
      window.removeEventListener('focus', onInvalidate)
    }
  }, [user?.id])

  const quickActions = useMemo(() => [
    {
      title: t(tr.dashboard.aacSetup, language),
      description: t(tr.dashboard.aacSetupDesc, language),
      icon: MessageSquare,
      path: '/aac/customization',
      tone: 'primary' as const,
    },
    {
      title: t(tr.dashboard.childExp, language),
      description: t(tr.dashboard.childExpDesc, language),
      icon: Baby,
      path: '/child/dashboard',
      tone: 'accent' as const,
    },
    {
      title: t(tr.dashboard.progressTitle, language),
      description: t(tr.dashboard.progressDesc, language),
      icon: BarChart3,
      path: '/progress',
      tone: 'sky' as const,
    },
  ], [language])

  const streakLabel = stats.communicationStreak === 1
    ? `${stats.communicationStreak} ${t(tr.dashboard.streakDay, language)}`
    : `${stats.communicationStreak} ${t(tr.dashboard.streakDays, language)}`

  const statCards = useMemo(() => [
    {
      title: t(tr.dashboard.vocabCards, language),
      value: String(stats.totalCards),
      hint: t(tr.dashboard.vocabHint, language),
      icon: MessageSquare,
      tone: 'primary' as const,
    },
    {
      title: t(tr.dashboard.sentencesToday, language),
      value: String(stats.sentencesToday),
      hint: t(tr.dashboard.sentencesHint, language),
      icon: Volume2,
      tone: 'accent' as const,
    },
    {
      title: t(tr.dashboard.topWord, language),
      value: stats.mostUsedCard || (isArabic ? 'لا يوجد' : 'None'),
      hint: t(tr.dashboard.topWordHint, language),
      icon: TrendingUp,
      tone: 'sky' as const,
    },
    {
      title: t(tr.dashboard.streak, language),
      value: streakLabel,
      hint: t(tr.dashboard.streakHint, language),
      icon: Flame,
      tone: 'sunny' as const,
    },
  ], [language, stats, isArabic, streakLabel])

  const handleMarkRead = async (id: string) => {
    try {
      await dashboardService.markAsRead(id)
      setNotifications((arr) => arr.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnread((u) => Math.max(0, u - 1))
    } catch (err) {
      console.error(err)
    }
  }
  const handleMarkAll = async () => {
    try {
      await dashboardService.markAllAsRead()
      setNotifications((arr) => arr.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch (err) {
      console.error(err)
    }
  }

  const quickTips = QUICK_TIPS[isArabic ? 'ar' : 'en']

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl"
      >
        <PageHeader
          eyebrow={t(tr.dashboard.eyebrow, language)}
          title={t(tr.dashboard.title, language)}
          description={t(tr.dashboard.subtitle, language)}
          actions={
            <Link to="/aac/customization">
              <Button variant="primary" leftIcon={<Sparkles className="h-4 w-4" />}>
                {t(tr.dashboard.customizeBoard, language)}
              </Button>
            </Link>
          }
          className="mb-8"
        />

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((a, i) => (
            <motion.div
              key={a.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={a.path} className="block h-full">
                <Card padding="md" hover variant="primary" className="group h-full hover:bg-primary-700 hover:border-primary-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl ring-1 bg-white/20 text-white ring-white/30">
                      <a.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-white">{a.title}</div>
                      <div className="text-sm text-white/80">{a.description}</div>
                    </div>
                    <ArrowRight className={`h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5 ${isArabic ? 'rotate-180' : ''}`} />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s, i) =>
            loading ? (
              <Card key={i} padding="md">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-10 w-10" shape="rect" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="mt-5 h-7 w-24" />
                <Skeleton className="mt-2 h-3 w-32" />
              </Card>
            ) : (
              <Card key={s.title} padding="md" variant="primary" className="group">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
                    <s.icon className="h-5 w-5 text-white" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                    {s.title}
                  </span>
                </div>
                <div className="mt-5 truncate text-2xl font-extrabold text-white">{s.value}</div>
                <div className="mt-1 text-xs text-white/70">{s.hint}</div>
              </Card>
            )
          )}
        </div>

        {/* Notifications */}
        {!loading && unread > 0 ? (
          <Card
            padding="md"
            className="mt-6 border-primary-200 dark:border-primary-800 bg-primary-50/40 dark:bg-primary-900/10"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-600 text-white shadow-soft">
                <Bell className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">
                    {t(tr.dashboard.notifications, language)}
                  </h2>
                  <Badge variant="primary" size="sm">
                    {unread} {isArabic ? 'جديد' : 'new'}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-2">
                  {notifications
                    .filter((n) => !n.read)
                    .slice(0, 3)
                    .map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="flex w-full items-start gap-3 rounded-xl bg-white dark:bg-ink-700 px-3 py-2.5 text-left ring-1 ring-primary-100 dark:ring-primary-900 transition-colors hover:bg-primary-50 dark:hover:bg-ink-600"
                        >
                          <NotifyIcon type={n.type} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                              {n.title}
                            </div>
                            <div className="truncate text-xs text-ink-600 dark:text-ink-300">{n.message}</div>
                          </div>
                          <span className="text-[11px] text-ink-500 dark:text-ink-400">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="subtle" size="sm" onClick={handleMarkAll}>
                  {t(tr.dashboard.markAllRead, language)}
                </Button>
                <Link to="/notifications">
                  <Button variant="ghost" size="sm">
                    {t(tr.dashboard.viewAll, language)}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Activity + Tips */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Card padding="md" className="lg:col-span-2">
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">
              {t(tr.dashboard.recentActivity, language)}
            </h2>

            <div className="mt-4 space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-ink-50/40 dark:bg-ink-800/40 p-3">
                    <Skeleton className="h-9 w-9" shape="circle" />
                    <div className="flex-1">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="mt-2 h-3 w-1/3" />
                    </div>
                  </div>
                ))
              ) : activity.length === 0 ? (
                <EmptyState
                  title={isArabic ? 'لا يوجد شيء بعد' : 'Nothing here yet'}
                  description={isArabic
                    ? 'عندما يستخدم طفلك اللوحة، ستظهر الأنشطة هنا.'
                    : "When your child uses the board, you'll see activity show up here."
                  }
                />
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-50/60 dark:hover:bg-ink-700/50"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      <ActivityIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                        {a.title}
                      </div>
                      {a.description ? (
                        <div className="truncate text-xs text-ink-600 dark:text-ink-300">{a.description}</div>
                      ) : null}
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-500 dark:text-ink-400">
                        <Calendar className="h-3 w-3" />
                        {a.time}
                        {a.childName ? <span>· {a.childName}</span> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card padding="md" variant="gradient">
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">
              {isArabic ? 'نصائح سريعة' : 'Quick tips'}
            </h2>
            <ol className="mt-4 space-y-4 text-sm">
              {quickTips.map((tip) => (
                <li key={tip.step} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary-600 text-xs font-bold text-white">
                    {tip.step}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink-900 dark:text-ink-50">{tip.title}</div>
                    <div className="text-xs text-ink-600 dark:text-ink-300">{tip.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}

function NotifyIcon({ type }: { type: Notification['type'] }) {
  const map = {
    SUCCESS: { Icon: CheckCircle2, cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-emerald-100 dark:ring-emerald-800' },
    WARNING: { Icon: AlertCircle, cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 ring-amber-100 dark:ring-amber-800' },
    INFO: { Icon: Info, cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 ring-sky-100 dark:ring-sky-800' },
    ERROR: { Icon: AlertCircle, cls: 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 ring-accent-100 dark:ring-accent-800' },
  } as const
  const entry = (type && map[type]) || map.INFO
  const { Icon, cls } = entry
  return (
    <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ring-1 ${cls}`}>
      <Icon className="h-4 w-4" />
    </span>
  )
}
