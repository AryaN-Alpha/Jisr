import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Award,
  Target,
  Clock,
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import Skeleton from '../components/Skeleton'
import { progressService, ProgressAnalytics } from '../services/progressService'
import { childService, Child } from '../services/childService'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

type Range = 'week' | 'month' | 'year'

const toneCls = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:ring-primary-800',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
  sunny: 'bg-sunny-50 text-sunny-700 ring-sunny-100 dark:bg-sunny-900/30 dark:text-sunny-300 dark:ring-sunny-800',
  accent: 'bg-accent-50 text-accent-700 ring-accent-100 dark:bg-accent-900/30 dark:text-accent-300 dark:ring-accent-800',
}

export default function Progress() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('childId') || undefined
  const [range, setRange] = useState<Range>('week')
  const [data, setData] = useState<ProgressAnalytics | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [timelinePage, setTimelinePage] = useState(1)
  const loadSeqRef = useRef(0)
  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    if (!user) {
      loadSeqRef.current += 1
      setData(null)
      setChild(null)
      setLoading(false)
      return
    }

    const seq = ++loadSeqRef.current
    const load = async () => {
      try {
        setLoading(true)
        setTimelinePage(1)
        const [result, childData] = await Promise.all([
          progressService.getProgress(range, childId),
          childId ? childService.getChild(childId).catch(() => null) : Promise.resolve(null),
        ])
        if (seq !== loadSeqRef.current) return
        setData(result)
        setChild(childData)
      } catch (err) {
        console.error('Failed to load progress:', err)
      } finally {
        if (seq === loadSeqRef.current) setLoading(false)
      }
    }
    void load()
    return () => {
      loadSeqRef.current += 1
    }
  }, [user?.id, range, childId])

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl"
      >
        <PageHeader
          eyebrow={language === 'ar' ? 'الرؤى' : 'Insights'}
          title={child ? `${child.name} ${language === 'ar' ? 'التقدم' : "'s progress"}` : language === 'ar' ? "التقدم العام والتحليلات" : "Overall progress & analytics"}
          description={child ? (language === 'ar' ? `شاهد كيف يتواصل ${child.name} وأين يجب التركيز بعد ذلك.` : `See how ${child.name} is communicating and where to focus next.`) : (language === 'ar' ? "شاهد كيف يتواصل أطفالك وأين يجب التركيز بعد ذلك." : "See how your children are communicating and where to focus next.")}
          actions={
            <div className="inline-flex rounded-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 p-0.5 shadow-soft">
              {(['week', 'month', 'year'] as Range[]).map((r) => {
                const tr = {
                  week: language === 'ar' ? 'أسبوع' : 'week',
                  month: language === 'ar' ? 'شهر' : 'month',
                  year: language === 'ar' ? 'سنة' : 'year'
                }
                return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={[
                    'rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors',
                    range === r
                      ? 'bg-ink-900 text-white shadow-soft dark:bg-primary-600 dark:text-white'
                      : 'text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-50',
                  ].join(' ')}
                >
                  {tr[r]}
                </button>
              )})}
            </div>
          }
          className="mb-8"
        />

        {loading || !data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} padding="md">
                  <Skeleton className="h-10 w-10" />
                  <Skeleton className="mt-5 h-7 w-16" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </Card>
              ))}
            </div>
            <Card padding="md">
              <Skeleton className="h-48 w-full" />
            </Card>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                icon={<TrendingUp className="h-5 w-5" />}
                label={language === 'ar' ? 'التقدم العام' : 'Overall progress'}
                value={`${data.overallProgress}%`}
                hint={language === 'ar' ? 'التفاعل النشط' : 'Active engagement'}
                tone="primary"
              />
              <Stat
                icon={<Award className="h-5 w-5" />}
                label={language === 'ar' ? 'متوسط النقاط' : 'Average score'}
                value={`${data.averageScore}%`}
                hint={language === 'ar' ? 'بناءً على الاستخدام' : 'Usage based'}
                tone="sunny"
              />
              <Stat
                icon={<Target className="h-5 w-5" />}
                label={language === 'ar' ? 'أيام متتالية' : 'Streak'}
                value={`${data.learningStreak} ${language === 'ar' ? 'أيام' : 'days'}`}
                hint={language === 'ar' ? 'واصل التقدم' : 'Keep it going'}
                tone="accent"
              />
            </div>

            {/* Activity & Achievements */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card padding="md" className="lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary-700 dark:text-primary-400" />
                    <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{language === 'ar' ? 'النشاط الأسبوعي' : 'Weekly activity'}</h2>
                  </div>
                  <Badge variant="primary" size="sm">
                    <Calendar className="h-3 w-3" />
                    {language === 'ar' ? (range === 'week' ? 'أسبوع' : range === 'month' ? 'شهر' : 'سنة') : range}
                  </Badge>
                </div>

                {data.weeklyActivity.length === 0 ? (
                  <EmptyState
                    title={language === 'ar' ? 'لا يوجد نشاط بعد' : 'No activity yet'}
                    description={language === 'ar' ? 'سيظهر النشاط هنا بمجرد أن يبدأ طفلك في استخدام اللوحة.' : 'Activity will appear here once your child starts using the board.'}
                    className="mt-4"
                  />
                ) : (
                  <div className="mt-6 flex h-56 items-end justify-between gap-2">
                    {data.weeklyActivity.map((d, i) => {
                      const max = Math.max(...data.weeklyActivity.map((x) => x.activities), 1)
                      const h = Math.max((d.activities / max) * 100, 3)
                      return (
                        <div key={i} className="flex flex-1 flex-col items-center gap-2">
                          <div className="relative flex h-full w-full items-end">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400"
                              title={`${d.activities} activities`}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-ink-600 dark:text-ink-300">{d.day}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              <Card padding="md">
                <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{language === 'ar' ? 'الإنجازات الأخيرة' : 'Recent achievements'}</h2>
                <div className="mt-4 space-y-2.5">
                  {data.recentAchievements.length === 0 ? (
                    <EmptyState
                      title={language === 'ar' ? 'لا توجد شارات بعد' : 'No badges yet'}
                      description={language === 'ar' ? 'اربح شارات من خلال الوصول إلى الإنجازات.' : 'Earn badges by hitting milestones.'}
                    />
                  ) : (
                    data.recentAchievements.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-50/60 dark:hover:bg-ink-700/50"
                      >
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-sunny-50 dark:bg-sunny-900/30 text-sunny-700 dark:text-sunny-300 ring-1 ring-sunny-100 dark:ring-sunny-800">
                          <Award className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                            {a.title}
                          </div>
                          <div className="truncate text-xs text-ink-600 dark:text-ink-300">{a.description}</div>
                          <div className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">{a.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Subject Progress */}
            <Card padding="md" className="mt-6">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{language === 'ar' ? 'تقدم المواضيع' : 'Subject progress'}</h2>
              <div className="mt-5 space-y-5">
                {data.subjectProgress.length === 0 ? (
                  <EmptyState title={language === 'ar' ? 'لا يوجد شيء لعرضه بعد' : 'Nothing to show yet'} />
                ) : (
                  data.subjectProgress.map((s, i) => (
                    <motion.div
                      key={s.subject}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{s.subject}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-ink-900 dark:text-ink-50">{s.progress}%</div>
                          <div className="text-[11px] text-ink-500 dark:text-ink-400">{language === 'ar' ? 'متوسط ' : 'Avg '}{s.avgScore}%</div>
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.progress}%` }}
                          transition={{ duration: 0.7, delay: 0.1 + i * 0.04 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-sky-500"
                        />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>

            {/* Timeline */}
            <Card padding="md" className="mt-6">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{language === 'ar' ? 'الجدول الزمني للتعلم' : 'Learning timeline'}</h2>
              {data.learningTimeline.length === 0 ? (
                <EmptyState title={language === 'ar' ? 'لا يوجد نشاط بعد' : 'No activity yet'} className="mt-4" />
              ) : (
                <>
                  <ol className="mt-5 space-y-0">
                    {data.learningTimeline
                      .slice((timelinePage - 1) * ITEMS_PER_PAGE, timelinePage * ITEMS_PER_PAGE)
                      .map((item, idx, arr) => (
                        <li key={idx} className="relative flex gap-4 pl-2">
                          <div className="relative flex w-3 flex-none items-start pt-1">
                            <span className="grid h-3 w-3 place-items-center rounded-full bg-primary-500 ring-4 ring-primary-50 dark:ring-primary-900" />
                            {idx < arr.length - 1 ? (
                              <span className="absolute left-1/2 top-3 -ml-px h-full w-0.5 bg-ink-100 dark:bg-ink-700" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1 pb-5">
                            <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{item.activity}</p>
                            <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-500 dark:text-ink-400">
                              <Clock className="h-3 w-3" />
                              {item.date} · {item.time}
                            </div>
                          </div>
                        </li>
                      ))}
                  </ol>
                  {data.learningTimeline.length > ITEMS_PER_PAGE && (
                    <div className="mt-4 flex items-center justify-between border-t border-ink-100 dark:border-ink-800 pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={timelinePage === 1}
                        onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
                      >
                        {language === 'ar' ? 'السابق' : 'Previous'}
                      </Button>
                      <span className="text-xs text-ink-500 dark:text-ink-400">
                        {language === 'ar' ? `الصفحة ${timelinePage} من ${Math.ceil(data.learningTimeline.length / ITEMS_PER_PAGE)}` : `Page ${timelinePage} of ${Math.ceil(data.learningTimeline.length / ITEMS_PER_PAGE)}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={timelinePage >= Math.ceil(data.learningTimeline.length / ITEMS_PER_PAGE)}
                        onClick={() => setTimelinePage((p) => p + 1)}
                      >
                        {language === 'ar' ? 'التالي' : 'Next'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  )
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tone: 'primary' | 'sky' | 'sunny' | 'accent'
}) {
  return (
    <Card padding="md" variant="primary">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl ring-1 bg-white/20 ring-white/30 text-white">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
          {label}
        </span>
      </div>
      <div className="mt-5 text-2xl font-extrabold text-white">{value}</div>
      <div className="mt-1 text-xs text-white/70">{hint}</div>
    </Card>
  )
}
