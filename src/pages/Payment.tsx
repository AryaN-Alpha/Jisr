import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CreditCard, Lock, CheckCircle2, Shield, ArrowRight, Tag,
  Sparkles, Loader2, Check,
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Toast from '../components/Toast'
import Badge from '../components/Badge'
import PageHeader from '../components/PageHeader'
import SubscriptionInfo from '../components/SubscriptionInfo'
import TransactionHistory from '../components/TransactionHistory'
import { paymentService, type TransactionItem, type DiscountValidationResponse } from '../services/paymentService'
import { billingService, type BillingInfo } from '../services/billingService'
import { useLanguage } from '../context/LanguageContext'
import { tr, t } from '../i18n/translations'

type Cycle = 'monthly' | 'yearly'

interface PlanRow {
  id: string; name: string; nameAr: string; description: string; descriptionAr: string
  monthly: number; yearly: number
  features: string[]; featuresAr: string[]
}

const PLAN_ROWS: PlanRow[] = [
  {
    id: 'free-plan', name: 'Free', nameAr: 'مجاني',
    description: 'Starter board', descriptionAr: 'لوحة أساسية',
    monthly: 0, yearly: 0,
    features: ['Up to 50 vocabulary cards', 'Basic text-to-speech', 'Single child profile'],
    featuresAr: ['حتى 50 بطاقة مفردات', 'تحويل النص إلى كلام أساسي', 'ملف شخصي لطفل واحد'],
  },
  {
    id: 'family-plan', name: 'Family', nameAr: 'العائلة',
    description: 'Up to 3 children', descriptionAr: 'حتى 3 أطفال',
    monthly: 15, yearly: 144,
    features: ['Unlimited vocabulary cards', 'Advanced text-to-speech', 'Priority support', 'Progress analytics'],
    featuresAr: ['بطاقات مفردات غير محدودة', 'تحويل نص إلى كلام متقدم', 'أولوية الدعم', 'تحليلات التقدم'],
  },
  {
    id: 'family-plus-plan', name: 'Family Plus', nameAr: 'العائلة بلس',
    description: 'Up to 5 children', descriptionAr: 'حتى 5 أطفال',
    monthly: 25, yearly: 240,
    features: ['Everything in Family', 'Up to 5 child profiles', 'Family management dashboard', 'Shared vocabulary'],
    featuresAr: ['كل ما في خطة العائلة', 'حتى 5 ملفات أطفال', 'لوحة إدارة العائلة', 'مفردات مشتركة'],
  },
]

const PLAN_HIERARCHY = ['free-plan', 'family-plan', 'family-plus-plan']

export default function Payment() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [searchParams] = useSearchParams()

  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ isVisible: false, message: '', type: 'success' })
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [loading, setLoading] = useState(false)
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [discountCode, setDiscountCode] = useState('')
  const [discountResult, setDiscountResult] = useState<DiscountValidationResponse | null>(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [planId, setPlanId] = useState<string>(searchParams.get('plan') || 'family-plan')
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [cancelLoading, setCancelLoading] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ isVisible: true, message, type })
    window.setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 3500)
  }

  const loadBilling = useCallback(async () => {
    try {
      setBillingLoading(true)
      const [data, txData] = await Promise.all([
        billingService.getBilling(),
        paymentService.getTransactions(1, 10),
      ])
      setBilling(data)
      setTransactions(txData.payments || [])
      if (!searchParams.get('plan') && data.currentPlan?.id) setPlanId(data.currentPlan.id)
    } catch (err) { console.error('Failed to load billing:', err) }
    finally { setBillingLoading(false) }
  }, [searchParams])

  useEffect(() => { loadBilling() }, [loadBilling])

  const selected = useMemo(() => PLAN_ROWS.find((p) => p.id === planId) || PLAN_ROWS[1], [planId])
  const price = cycle === 'monthly' ? selected.monthly : selected.yearly
  const isFree = price === 0

  // Active subscription checks
  const activePlanId = billing?.currentPlan?.id || null
  const activeTier = activePlanId ? PLAN_HIERARCHY.indexOf(activePlanId) : -1
  const selectedTier = PLAN_HIERARCHY.indexOf(planId)
  const hasActiveSub = billing?.subscriptionStatus === 'active' || billing?.subscriptionStatus === 'cancelled'
  const isCurrentPlan = activePlanId === planId && hasActiveSub
  const canPurchase = !isCurrentPlan && (!hasActiveSub || selectedTier > activeTier)
  const isUpgrade = hasActiveSub && selectedTier > activeTier

  // Final price after discount
  const finalPrice = discountResult?.valid ? discountResult.discountedPrice ?? price : price

  const onApplyDiscount = async () => {
    if (!discountCode.trim()) return
    setDiscountLoading(true)
    try {
      const result = await paymentService.validateDiscount(discountCode.trim(), planId)
      setDiscountResult(result)
      if (result.valid) showToast(t(tr.payment.discountApplied, language), 'success')
      else showToast(result.message || t(tr.payment.discountInvalid, language), 'error')
    } catch { showToast(t(tr.payment.discountInvalid, language), 'error') }
    finally { setDiscountLoading(false) }
  }

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isFree) { showToast(isAr ? 'تم اختيار الخطة المجانية — لا حاجة للدفع.' : 'Free plan selected — no payment needed.', 'info'); return }
    if (!canPurchase) { showToast(t(tr.payment.upgradeOnly, language), 'warning'); return }
    setLoading(true)
    try {
      const data: any = { planId: selected.id }
      if (discountCode.trim()) data.discountCode = discountCode.trim()
      const session = await paymentService.createPaymentSession(data)
      if (!session?.sessionUrl) throw new Error('Invalid checkout session')
      paymentService.redirectToCheckout(session.sessionUrl)
    } catch (err: any) {
      showToast(err?.message || 'Could not start checkout. Please try again.', 'error')
      setLoading(false)
    }
  }

  const onCancel = async () => {
    setCancelLoading(true)
    try {
      const res = await billingService.cancelSubscription()
      showToast(res.message, 'success')
      await loadBilling()
    } catch (err: any) { showToast(err?.message || 'Failed to cancel', 'error') }
    finally { setCancelLoading(false) }
  }

  // Reset discount when plan changes
  useEffect(() => { setDiscountResult(null) }, [planId])

  return (
    <DashboardLayout>
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))} />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow={t(tr.payment.eyebrow, language)}
          title={t(tr.payment.title, language)}
          description={t(tr.payment.description, language)}
          actions={<Badge variant="success" icon={<Shield className="h-3.5 w-3.5" />}>SSL · PCI compliant</Badge>}
          className="mb-8"
        />

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-5">
            {/* Active Subscription Info */}
            {!billingLoading && billing?.currentPlan && (
              <SubscriptionInfo billing={billing} onCancel={onCancel} cancelLoading={cancelLoading} />
            )}

            {/* Payment method + checkout form */}
            <Card padding="lg">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{t(tr.payment.paymentMethod, language)}</h2>
              <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{t(tr.payment.paySecurely, language)}</p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700 p-4">
                <CreditCard className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-none" />
                <div>
                  <p className="font-semibold text-ink-900 dark:text-ink-50">{t(tr.payment.cardPayment, language)}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">Visa, Mastercard, Mada</p>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <form onSubmit={onPay} className="space-y-4">
                {hasActiveSub && !canPurchase && !isFree && (
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4 ring-1 ring-amber-100 dark:ring-amber-800">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t(tr.payment.alreadySubscribed, language)}</p>
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{t(tr.payment.upgradeOnly, language)}</p>
                  </div>
                )}

                {canPurchase && !isFree && (
                  <div className="rounded-2xl bg-sky-50 dark:bg-sky-900/20 p-4 ring-1 ring-sky-100 dark:ring-sky-800">
                    <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-200">{t(tr.payment.redirectNotice, language)}</p>
                  </div>
                )}

                {/* Discount input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label={t(tr.payment.discountCode, language)}
                      placeholder="e.g. WELCOME20"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      leftIcon={<Tag className="h-4 w-4" />}
                    />
                  </div>
                  <Button type="button" variant="outline" size="md" onClick={onApplyDiscount} loading={discountLoading} disabled={!discountCode.trim() || isFree}>
                    {t(tr.payment.apply, language)}
                  </Button>
                </div>

                {discountResult?.valid && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-100 dark:ring-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-none" />
                    <span>
                      <strong>{discountResult.discount?.code}</strong> — {discountResult.discount?.type === 'PERCENTAGE' ? `${discountResult.discount.value}%` : `${discountResult.discount?.value} OMR`} {t(tr.payment.off, language)}
                      {' · '}{t(tr.payment.discount, language)}: -{discountResult.discountAmount} OMR
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  {t(tr.payment.encrypted, language)}
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}
                  rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
                  disabled={isFree || !canPurchase}
                >
                  {isFree
                    ? t(tr.payment.freePlanSelected, language)
                    : !canPurchase
                      ? t(tr.payment.alreadySubscribed, language)
                      : isUpgrade
                        ? `${t(tr.payment.upgrade, language)} · ${finalPrice} OMR`
                        : `${t(tr.payment.continueCheckout, language)} · ${finalPrice} OMR`}
                </Button>
              </form>
            </Card>

            {/* Trust badges */}
            <Card padding="lg" variant="ghost">
              <div className="grid gap-4 sm:grid-cols-3">
                <Trust icon={<Shield className="h-5 w-5" />} title={t(tr.payment.sslSecured, language)} desc={t(tr.payment.bankEncryption, language)} />
                <Trust icon={<Lock className="h-5 w-5" />} title={t(tr.payment.pciCompliant, language)} desc={t(tr.payment.noCardStored, language)} />
                <Trust icon={<CheckCircle2 className="h-5 w-5" />} title={t(tr.payment.trial14, language)} desc={t(tr.payment.cancelAnytime, language)} />
              </div>
            </Card>

            {/* Transaction history */}
            {!billingLoading && <TransactionHistory transactions={transactions} />}
          </div>

          {/* Right column — Plan selector */}
          <div className="lg:col-span-2">
            <Card padding="lg" className="lg:sticky lg:top-24">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{t(tr.payment.choosePlan, language)}</h2>
                <div className="inline-flex rounded-full border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-800 p-0.5 text-[11px] font-semibold">
                  {(['monthly', 'yearly'] as Cycle[]).map((c) => (
                    <button key={c} type="button" onClick={() => setCycle(c)}
                      className={['rounded-full px-2.5 py-1 transition-colors', cycle === c ? 'bg-ink-900 dark:bg-primary-600 text-white' : 'text-ink-600 dark:text-ink-300 hover:text-ink-800 dark:hover:text-ink-50'].join(' ')}
                    >
                      {c === 'monthly' ? t(tr.payment.monthly, language) : t(tr.payment.yearly, language)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {PLAN_ROWS.map((p) => {
                  const active = planId === p.id
                  const isCurrent = !billingLoading && activePlanId === p.id && hasActiveSub
                  const pTier = PLAN_HIERARCHY.indexOf(p.id)
                  const isLowerTier = hasActiveSub && pTier <= activeTier && pTier >= 0
                  const planPrice = cycle === 'monthly' ? p.monthly : p.yearly

                  return (
                    <button type="button" key={p.id}
                      onClick={() => setPlanId(p.id)}
                      disabled={isCurrent}
                      className={[
                        'flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition-all',
                        p.id === 'family-plan' && !isCurrent
                          ? 'border-primary-700 bg-primary-600 ring-2 ring-primary-500 hover:bg-primary-700'
                          : active
                            ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-800'
                            : 'border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 hover:border-ink-300 dark:hover:border-ink-600',
                        isCurrent ? 'opacity-70 cursor-default' : '',
                        isLowerTier && !isCurrent ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${p.id === 'family-plan' && !isCurrent ? 'text-white' : 'text-ink-900 dark:text-ink-50'}`}>
                            {isAr ? p.nameAr : p.name}
                          </span>
                          {isCurrent && <Badge variant="success" size="sm">{t(tr.payment.current, language)}</Badge>}
                          {isLowerTier && !isCurrent && hasActiveSub && <Badge variant="neutral" size="sm">{isAr ? 'غير متاح' : 'N/A'}</Badge>}
                        </div>
                        <div className={`mt-0.5 text-xs ${p.id === 'family-plan' && !isCurrent ? 'text-white/70' : 'text-ink-500 dark:text-ink-400'}`}>
                          {isAr ? p.descriptionAr : p.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${p.id === 'family-plan' && !isCurrent ? 'text-white' : 'text-ink-900 dark:text-ink-50'}`}>{planPrice} OMR</div>
                        <div className={`text-[11px] ${p.id === 'family-plan' && !isCurrent ? 'text-white/70' : 'text-ink-500 dark:text-ink-400'}`}>/{cycle === 'monthly' ? 'mo' : 'yr'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Plan features */}
              <div className="mt-4 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">{t(tr.payment.features, language)}</h3>
                <ul className="space-y-1.5">
                  {(isAr ? selected.featuresAr : selected.features).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-ink-700 dark:text-ink-300">
                      <Check className="h-3.5 w-3.5 mt-0.5 text-primary-600 dark:text-primary-400 flex-none" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price summary */}
              <dl className="mt-5 space-y-1.5 border-t border-ink-100 dark:border-ink-700 pt-4 text-sm">
                <div className="flex justify-between text-ink-600 dark:text-ink-300">
                  <dt>{t(tr.payment.subtotal, language)}</dt>
                  <dd className="font-medium text-ink-900 dark:text-ink-50">{price} OMR</dd>
                </div>
                {discountResult?.valid && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <dt>{t(tr.payment.discount, language)}</dt>
                    <dd className="font-medium">-{discountResult.discountAmount} OMR</dd>
                  </div>
                )}
                <div className="flex justify-between text-ink-600 dark:text-ink-300">
                  <dt>{t(tr.payment.tax, language)}</dt>
                  <dd className="font-medium text-ink-900 dark:text-ink-50">0.00 OMR</dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-ink-100 dark:border-ink-700 pt-3 text-base font-bold text-ink-900 dark:text-ink-50">
                  <dt>{t(tr.payment.totalToday, language)}</dt>
                  <dd>
                    {finalPrice} OMR
                    <span className="ml-1 text-xs font-medium text-ink-500 dark:text-ink-400">
                      / {cycle === 'monthly' ? (isAr ? 'شهر' : 'mo') : (isAr ? 'سنة' : 'yr')}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-100 dark:ring-emerald-800">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                {t(tr.payment.trialNote, language)}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}

function Trust({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white dark:bg-ink-700 text-primary-700 dark:text-primary-400 shadow-soft">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</div>
        <div className="text-xs text-ink-600 dark:text-ink-300">{desc}</div>
      </div>
    </div>
  )
}
