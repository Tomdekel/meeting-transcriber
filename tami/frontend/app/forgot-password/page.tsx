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
    // Redirect if already logged in
    if (user) {
      router.push('/transcribe')
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-text-secondary">טוען...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 space-y-6 text-center">
          <div className="text-6xl">📧</div>
          <h1 className="text-2xl font-bold text-text-primary">בדוק את האימייל שלך</h1>
          <p className="text-text-secondary">
            אם הכתובת קיימת במערכת, שלחנו לך קישור לאיפוס הסיסמה.
          </p>
          <Link href="/login" className="btn-secondary inline-block px-6 py-2">
            חזור לדף ההתחברות
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-text-primary">תמי</h1>
          <p className="text-xl text-text-secondary">איפוס סיסמה</p>
        </div>

        <div className="space-y-6 pt-4">
          <p className="text-text-secondary text-center">
            הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
          </p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                אימייל
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-error text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50"
            >
              {isSubmitting ? 'שולח...' : 'שלח קישור לאיפוס'}
            </button>
          </form>

          <div className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              חזור לדף ההתחברות
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
