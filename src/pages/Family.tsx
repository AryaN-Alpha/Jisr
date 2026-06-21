import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  UserPlus,
  Award,
  TrendingUp,
  Calendar,
  Edit,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import Skeleton from '../components/Skeleton'
import Toast from '../components/Toast'
import { childService, Child } from '../services/childService'
import { userService } from '../services/userService'
import { progressService, ProgressAnalytics } from '../services/progressService'
import { useLanguage } from '../context/LanguageContext'
import { useChild } from '../context/ChildContext'

export default function Family() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { children, loading: childrenLoading, refresh: refreshChildren } = useChild()
  const [open, setOpen] = useState(false)
  const [childProgress, setChildProgress] = useState<Map<string, ProgressAnalytics>>(new Map())
  const [progressLoading, setProgressLoading] = useState(true)
  const progressSeqRef = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: '',
    relationship: 'child',
    email: '',
    username: '',
    pin: '',
  })

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [editForm, setEditForm] = useState({ name: '', age: '', username: '', pin: '' })
  const [updating, setUpdating] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    title?: string
    visible: boolean
  }>({ message: '', type: 'info', visible: false })

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    title?: string
  ) => {
    setToast({ message, type, title, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 5000)
  }

  const loadProgress = useCallback(async (childList: Child[]) => {
    const seq = ++progressSeqRef.current
    try {
      setProgressLoading(true)
      setError(null)
      const validChildren = childList.filter((c) => c && c.id && c.name)
      const results = await Promise.allSettled(
        validChildren.map((c) => progressService.getProgress('week', c.id))
      )
      if (seq !== progressSeqRef.current) return

      const map = new Map<string, ProgressAnalytics>()
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          map.set(validChildren[idx].id, result.value)
        }
      })
      setChildProgress(map)
    } catch (err: any) {
      if (seq !== progressSeqRef.current) return
      console.error(err)
      setError(err?.message || 'Failed to load family members')
      setChildProgress(new Map())
    } finally {
      if (seq === progressSeqRef.current) setProgressLoading(false)
    }
  }, [])

  useEffect(() => {
    if (childrenLoading) return
    void loadProgress(children)
  }, [children, childrenLoading, loadProgress])

  const loading = childrenLoading || progressLoading

  const handleRetry = () => {
    void refreshChildren()
  }

  const initials = (name: string) => {
    if (!name) return 'U'
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const members = useMemo(() => {
    return children
      .filter((c) => c && c.id && c.name)
      .map((c) => {
        const prog = childProgress.get(c.id)
        return {
          id: c.id,
          name: c.name,
          age: c.age || 0,
          avatar: initials(c.name),
          progress: prog?.overallProgress ?? 0,
          achievements: prog?.recentAchievements?.length ?? 0,
          streak: prog?.learningStreak ?? 0,
          lastActive: 'Just added',
        }
      })
  }, [children, childProgress])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const email = form.email.trim()
      if (email) {
        try {
          const check = await userService.checkEmail(email)
          if (check.exists) {
            showToast(
              `This email is already registered (${check.accountType || 'existing user'}).`,
              'warning',
              'Email already in use'
            )
            setCreating(false)
            return
          }
        } catch (emailErr: any) {
          // If email check fails, log but don't block child creation
          console.warn('Email check failed, proceeding without check:', emailErr)
        }
      }

      await childService.createChild({
        name: form.name.trim(),
        age: form.age ? parseInt(form.age, 10) : undefined,
        username: form.username.trim() || undefined,
        pin: form.pin || undefined,
      })
      setOpen(false)
      setForm({ name: '', age: '', relationship: 'child', email: '', username: '', pin: '' })
      showToast('Child added successfully!', 'success', 'Child created')
    } catch (err: any) {
      console.error('Create child error:', err)
      const message = err?.message || 'Failed to add child.'
      showToast(message, 'error', 'Could not add child')
    } finally {
      setCreating(false)
    }
  }

  const handleEditOpen = (childId: string) => {
    const child = children.find((c) => c.id === childId)
    if (!child) return
    setEditingChild(child)
    setEditForm({
      name: child.name,
      age: child.age != null ? String(child.age) : '',
      username: child.username || '',
      pin: '',
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChild) return
    setUpdating(true)
    try {
      await childService.updateChild(editingChild.id, {
        name: editForm.name.trim(),
        age: editForm.age ? parseInt(editForm.age, 10) : undefined,
        username: editForm.username.trim() || undefined,
        pin: editForm.pin || undefined,
      })
      setEditOpen(false)
      setEditingChild(null)
      showToast('Child updated successfully!', 'success', 'Child updated')
    } catch (err: any) {
      console.error('Update child error:', err)
      const message = err?.message || 'Failed to update child.'
      showToast(message, 'error', 'Could not update child')
    } finally {
      setUpdating(false)
    }
  }

  const handleViewProfile = (childId: string) => {
    navigate(`/progress?childId=${childId}`)
  }

  return (
    <DashboardLayout>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        title={toast.title}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl"
      >
        <PageHeader
          eyebrow={language === 'ar' ? 'الأشخاص' : 'People'}
          title={language === 'ar' ? 'العائلة' : 'Family'}
          description={language === 'ar' ? 'إدارة الأطفال المتصلين بحسابك وتتبع تقدمهم.' : 'Manage children connected to your account and track their progress.'}
          actions={
            <Button
              variant="primary"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => setOpen(true)}
            >
              {language === 'ar' ? 'إضافة طفل' : 'Add child'}
            </Button>
          }
          className="mb-8"
        />

        {error ? (
          <Card padding="md" className="mb-6 border-accent-200 dark:border-accent-800 bg-accent-50/40 dark:bg-accent-900/10">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-accent-900 dark:text-accent-300">Couldn't load children</h3>
                <p className="text-sm text-accent-700 dark:text-accent-400">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </Card>
        ) : null}

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="md">
                <Skeleton className="h-12 w-12" shape="circle" />
                <Skeleton className="mt-4 h-5 w-1/2" />
                <Skeleton className="mt-2 h-3 w-1/3" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={language === 'ar' ? 'لا يوجد أطفال بعد' : 'No children yet'}
            description={language === 'ar' ? 'أضف طفلك الأول للبدء في بناء لوحة التواصل الخاصة به.' : 'Add your first child to start building their communication board.'}
            action={
              <Button
                variant="primary"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setOpen(true)}
              >
                {language === 'ar' ? 'إضافة طفل' : 'Add child'}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {members.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card padding="md" hover>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-base font-bold text-white">
                        {m.avatar}
                      </div>
                      <div>
                        <div className="text-base font-bold text-ink-900 dark:text-ink-50">{m.name}</div>
                        <div className="text-xs text-ink-500 dark:text-ink-400">{language === 'ar' ? `طفل · العمر ${m.age}` : `Child · age ${m.age}`}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditOpen(m.id)}
                      className="rounded-lg p-2 text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700 hover:text-ink-700 dark:hover:text-ink-300"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <Stat icon={<TrendingUp className="h-4 w-4" />} label={language === 'ar' ? 'التقدم' : 'Progress'} value={`${m.progress}%`} />
                    <Stat icon={<Award className="h-4 w-4" />} label={language === 'ar' ? 'الشارات' : 'Badges'} value={`${m.achievements}`} />
                    <Stat icon={<Calendar className="h-4 w-4" />} label={language === 'ar' ? 'أيام متتالية' : 'Streak'} value={`${m.streak}d`} />
                  </div>

                  <div className="mt-5">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-ink-500 dark:text-ink-400">
                      <span>{language === 'ar' ? 'التقدم العام' : 'Overall progress'}</span>
                      <span>{m.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-sky-500"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    className="mt-5"
                    onClick={() => handleViewProfile(m.id)}
                  >
                    {language === 'ar' ? 'عرض الملف الشخصي' : 'View profile'}
                  </Button>
                </Card>
              </motion.div>
            ))}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid place-items-center rounded-2xl border-2 border-dashed border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 p-6 text-center transition-colors hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/40 dark:hover:bg-primary-900/10"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-400">
                <Plus className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-ink-900 dark:text-ink-50">{language === 'ar' ? 'إضافة طفل آخر' : 'Add another child'}</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">{language === 'ar' ? 'حتى 5 أطفال مع خطة العائلة' : 'Up to 5 children with Family Plus'}</div>
            </button>
          </div>
        )}

        {/* Family Overview */}
        {!loading && members.length > 0 ? (
          <Card padding="md" className="mt-8">
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{language === 'ar' ? 'نظرة عامة على العائلة' : 'Family overview'}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Overview
                icon={<Users className="h-5 w-5" />}
                value={String(members.length)}
                label={language === 'ar' ? 'الأعضاء النشطين' : 'Active members'}
              />
              <Overview
                icon={<Award className="h-5 w-5" />}
                value={String(members.reduce((s, m) => s + m.achievements, 0))}
                label={language === 'ar' ? 'الإنجازات' : 'Achievements'}
              />
              <Overview
                icon={<TrendingUp className="h-5 w-5" />}
                value={`${Math.round(
                  members.reduce((s, m) => s + m.progress, 0) / Math.max(members.length, 1)
                )}%`}
                label={language === 'ar' ? 'متوسط التقدم' : 'Avg progress'}
              />
            </div>
          </Card>
        ) : null}

        {/* Add Child Modal */}
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Add a child"
          description="They'll have their own AAC board and progress tracked under your account."
          size="md"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Full name"
              placeholder="e.g. Liam"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Age"
              type="number"
              placeholder="e.g. 6"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-800 dark:text-ink-200">Relationship</label>
              <select
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className="field-input"
              >
                <option value="child">Child</option>
                <option value="ward">Ward</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input
              label="Username"
              placeholder="e.g. liam_2024"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
              hint="Your child will use this to log in. Letters, numbers and underscores only."
              required
            />
            <Input
              label="4-digit PIN"
              type="password"
              placeholder="e.g. 1234"
              maxLength={4}
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              hint="A simple PIN your child will use to log in."
              required
            />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" fullWidth onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={creating}>
                Add child
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Child Modal */}
        <Modal
          isOpen={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditingChild(null)
            setEditForm({ name: '', age: '', username: '', pin: '' })
          }}
          title="Edit child"
          description="Update your child's details. Leave PIN blank to keep the current one."
          size="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="Full name"
              placeholder="e.g. Liam"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Input
              label="Age"
              type="number"
              placeholder="e.g. 6"
              value={editForm.age}
              onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
            />
            <Input
              label="Username"
              placeholder="e.g. liam_2024"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
              hint="Used by your child to log in."
            />
            <Input
              label="New PIN"
              type="password"
              placeholder="Leave blank to keep current PIN"
              maxLength={4}
              value={editForm.pin}
              onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              hint="4 digits only. Leave blank to keep the current PIN."
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  setEditOpen(false)
                  setEditingChild(null)
                  setEditForm({ name: '', age: '', username: '', pin: '' })
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={updating}>
                Save changes
              </Button>
            </div>
          </form>
        </Modal>
      </motion.div>
    </DashboardLayout>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50/60 dark:bg-ink-700/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500 dark:text-ink-400">
        <span className="text-primary-600 dark:text-primary-400">{icon}</span>
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-ink-900 dark:text-ink-50">{value}</div>
    </div>
  )
}

function Overview({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl border border-ink-100 dark:border-ink-700 bg-ink-50/40 dark:bg-ink-800/30 p-4 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-soft">
        {icon}
      </span>
      <div className="mt-3 text-2xl font-extrabold text-ink-900 dark:text-ink-50">{value}</div>
      <div className="text-xs text-ink-600 dark:text-ink-300">{label}</div>
    </div>
  )
}
