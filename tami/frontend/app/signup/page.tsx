'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SignupPage() {
  const { user, loading, signUpWithEmail, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (user) {
      router.push('/conversations')
    }
  }, [user, router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להיות לפחות 6 תווים')
      return
    }

    setIsSubmitting(true)
    const result = await signUpWithEmail(email, password)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]" dir="rtl">
        <div className="text-[#6B7280]">טוען...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4" dir="rtl">
        <div
          className="max-w-[400px] w-full bg-white rounded-[8px] p-8 text-center"
          style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' }}
        >
          <div className="text-[48px] mb-4">📧</div>
          <h1 className="text-[22px] font-bold text-[#1F2937] mb-2">בדוק את האימייל שלך</h1>
          <p className="text-[14px] text-[#6B7280] mb-6 leading-relaxed">
            שלחנו לך קישור לאימות החשבון. לחץ על הקישור באימייל כדי להשלים את ההרשמה.
          </p>
          <Link
            href="/login"
            className="inline-block h-[44px] px-6 bg-white border border-[#D1D5DB] hover:border-[#9CA3AF] rounded-[8px] text-[#1F2937] font-medium transition-colors leading-[44px]"
          >
            חזור לדף ההתחברות
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] px-4" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-[30px] font-bold text-[#1F2937] mb-2">תמי</h1>
        <p className="text-[15px] text-[#6B7280]">צור חשבון חדש</p>
      </div>

      {/* Signup Card */}
      <div
        className="w-full max-w-[400px] bg-white rounded-[8px] p-8"
        style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' }}
      >
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-[14px] font-medium text-[#1F2937] mb-2 text-right">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full h-[44px] px-3 rounded-[8px] border bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent ${
                error ? 'border-[#DC2626]' : 'border-[#E5E7EB]'
              }`}
              placeholder="name@company.com"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-[14px] font-medium text-[#1F2937] mb-2 text-right">
              סיסמה
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full h-[44px] px-3 pl-10 rounded-[8px] border bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent ${
                  error ? 'border-[#DC2626]' : 'border-[#E5E7EB]'
                }`}
                placeholder="לפחות 6 תווים"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-[14px] font-medium text-[#1F2937] mb-2 text-right">
              אימות סיסמה
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full h-[44px] px-3 pl-10 rounded-[8px] border bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2B3A67] focus:border-transparent ${
                  error ? 'border-[#DC2626]' : 'border-[#E5E7EB]'
                }`}
                placeholder="הזן שוב את הסיסמה"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-[#DC2626] text-[13px] text-center">{error}</p>
          )}

          {/* Signup Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[44px] bg-[#2B3A67] hover:bg-[#1F2937] text-white font-medium rounded-[8px] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'יוצר חשבון...' : 'צור חשבון'}
          </button>
        </form>

        {/* Links Row */}
        <div className="text-center mt-4 text-[13px]">
          <span className="text-[#6B7280]">כבר יש לך חשבון? </span>
          <Link href="/login" className="text-[#2B3A67] hover:underline">
            התחבר
          </Link>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E7EB]"></div>
          </div>
          <div className="relative flex justify-center text-[13px]">
            <span className="px-4 bg-white text-[#6B7280]">או</span>
          </div>
        </div>

        {/* Google Signup */}
        <button
          onClick={signInWithGoogle}
          className="w-full h-[44px] bg-white border border-[#D1D5DB] hover:border-[#9CA3AF] rounded-[8px] flex items-center justify-center gap-3 text-[#1F2937] font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>הרשם עם Google</span>
        </button>
      </div>

      {/* Legal Text */}
      <p className="text-[11px] text-[#6B7280] text-center mt-6">
        בהרשמה, אתה מסכים לתנאי השימוש ומדיניות הפרטיות.
      </p>
    </div>
  )
}
