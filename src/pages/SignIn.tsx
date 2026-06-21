import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Check } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/Button'
import Input from '../components/Input'
import Toast from '../components/Toast'
import { authService } from '../services/authService'
import { useAuth } from '../context/AuthContext'

import { useLanguage } from '../context/LanguageContext'

export default function SignIn() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { refetch } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [toast, setToast] = useState<{
    isVisible: boolean
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ isVisible: false, message: '', type: 'success' })

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success'
  ) => {
    setToast({ isVisible: true, message, type })
    window.setTimeout(() => setToast((t) => ({ ...t, isVisible: false })), 3500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) errs.email = 'Email is required'
    else if (!emailRe.test(formData.email)) errs.email = 'Enter a valid email address'
    if (!formData.password) errs.password = 'Password is required'
    else if (formData.password.length < 6)
      errs.password = 'Password must be at least 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const auth = await authService.login({
        email: formData.email,
        password: formData.password,
      })
      showToast('Welcome back!', 'success')
      const role = auth.user?.role
      const accountType = (auth.user?.accountType || '').toLowerCase()
      let dest = '/dashboard'
      if (role === 'ADMIN') dest = '/admin/dashboard'
      else if (accountType === 'child') dest = '/child/aac'
      await refetch()
      navigate(dest, { replace: true })
    } catch (err: any) {
      setSubmitting(false)
      showToast(err?.message || 'Invalid credentials. Please try again.', 'error')
    }
  }

  return (
    <AuthLayout
      title={language === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
      description={language === 'ar' ? 'سجل الدخول للمتابعة.' : 'Sign in to continue your journey with Jisr.'}
      hero={{
        title: language === 'ar' ? 'أكمل من حيث توقفت' : 'Pick up where you left off',
        description: language === 'ar' ? 'سجل الدخول لفتح لوحتك وإدارة مفردات طفلك.' : 'Sign in to open your dashboard, manage your child’s AAC boards and vocabulary.',
      }}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((t) => ({ ...t, isVisible: false }))}
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-ink-800">
            {language === 'ar' ? 'تسجيل الدخول كـ' : 'Sign in as'}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-primary-400 bg-primary-50 p-3 ring-2 ring-primary-200">
              <div className="flex items-center justify-between text-sm font-semibold text-primary-800">
                {language === 'ar' ? 'العائلة' : 'Family'}
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-500">
                {language === 'ar' ? 'تسجيل الدخول بالبريد الإلكتروني' : 'Sign in with email and password.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/child/login')}
              className="rounded-xl border border-ink-200 bg-white p-3 text-left transition-all hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="text-sm font-semibold text-ink-800">{language === 'ar' ? 'الطفل' : 'Child'}</div>
              <p className="mt-1 text-[11px] leading-snug text-ink-500">
                {language === 'ar' ? 'تسجيل الدخول باسم المستخدم' : 'Sign in with username and PIN.'}
              </p>
            </button>
          </div>
        </fieldset>

        <Input
          name="email"
          type="email"
          label={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <Input
          name="password"
          type={showPassword ? 'text' : 'password'}
          label={language === 'ar' ? 'كلمة المرور' : 'Password'}
          placeholder="••••••••"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="pointer-events-auto rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-2 focus:ring-primary-200"
            />
            {language === 'ar' ? 'تذكرني' : 'Remember me'}
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            {language === 'ar' ? 'هل نسيت كلمة المرور؟' : 'Forgot password?'}
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          rightIcon={!submitting ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-ink-600">
        {language === 'ar' ? 'ليس لديك حساب؟ ' : 'Don’t have an account? '}
        <Link
          to="/signup"
          className="font-semibold text-primary-700 hover:text-primary-800"
        >
          {language === 'ar' ? 'إنشاء حساب' : 'Create one'}
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-4 text-xs text-ink-600">
        <span className="font-semibold text-ink-800">Tip:</span> If you run an organization,
        sign in with your admin email or use{' '}
        <Link to="/admin/login" className="font-semibold text-primary-700 hover:underline">
          the admin portal
        </Link>
        .
      </div>
    </AuthLayout>
  )
}
