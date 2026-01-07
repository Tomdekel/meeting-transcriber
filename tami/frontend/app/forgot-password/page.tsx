'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const { user, loading, resetPassword } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      router.push('/conversations')
    }
  }, [user, router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await resetPassword(email)
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
            אם הכתובת קיימת במערכת, שלחנו לך קישור לאיפוס הסיסמה.
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
        <p className="text-[15px] text-[#6B7280]">איפוס סיסמה</p>
      </div>

      {/* Reset Card */}
      <div
        className="w-full max-w-[400px] bg-white rounded-[8px] p-8"
        style={{ boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' }}
      >
        <p className="text-[14px] text-[#6B7280] text-center mb-6">
          הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
        </p>

        <form onSubmit={handleResetPassword} className="space-y-5">
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

          {/* Error Message */}
          {error && (
            <p className="text-[#DC2626] text-[13px] text-center">{error}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[44px] bg-[#2B3A67] hover:bg-[#1F2937] text-white font-medium rounded-[8px] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'שולח...' : 'שלח קישור לאיפוס'}
          </button>
        </form>

        {/* Back to Login */}
        <div className="text-center mt-5">
          <Link href="/login" className="text-[14px] text-[#2B3A67] hover:underline">
            חזור לדף ההתחברות
          </Link>
        </div>
      </div>
    </div>
  )
}
