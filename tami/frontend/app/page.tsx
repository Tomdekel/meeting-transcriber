'use client'

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-text-secondary">טוען...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-8 px-4 max-w-5xl">
          <div className="space-y-4">
            <h1 className="text-7xl font-bold text-text-primary">
              תמי
            </h1>
            <p className="text-3xl text-text-secondary">
              תמלול חכם לפגישות - AI מתקדם לעסקים ישראליים
            </p>
          </div>

          <div className="space-y-4 text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
            <p>
              העלה הקלטת פגישה וקבל תמלול מדויק בעברית עם זיהוי דוברים,
              סיכום חכם, פעולות מעקב ואפשרות לשאול שאלות על התוכן
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {user ? (
              <>
                <Link href="/transcribe" className="btn-primary px-8 py-4 text-lg">
                  התחל עכשיו
                </Link>
                <Link href="/sessions" className="btn-secondary px-8 py-4 text-lg">
                  הפגישות שלי
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={signInWithGoogle}
                  className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  התחבר עם Google
                </button>
                <Link href="/login" className="btn-secondary px-8 py-4 text-lg">
                  למד עוד
                </Link>
              </>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 pt-16 max-w-4xl mx-auto">
            <FeatureCard
              icon="🎤"
              title="תמלול מדויק"
              description="AI מתקדם לזיהוי דיבור בעברית עם דיוק גבוה"
            />
            <FeatureCard
              icon="👥"
              title="זיהוי דוברים"
              description="הפרדה אוטומטית של דוברים עם אפשרות למתן שמות"
            />
            <FeatureCard
              icon="📝"
              title="סיכום חכם"
              description="נקודות מפתח, פעולות מעקב וסיכום מקיף"
            />
            <FeatureCard
              icon="💬"
              title="שיחה עם התמלול"
              description="שאל שאלות על התוכן וקבל תשובות מדויקות"
            />
            <FeatureCard
              icon="⚡"
              title="מהיר ויעיל"
              description="תמלול מהיר עם תוצאות באיכות גבוהה"
            />
            <FeatureCard
              icon="🔒"
              title="מאובטח ופרטי"
              description="המידע שלך נשמר באופן מאובטח ופרטי"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary">{description}</p>
    </div>
  )
}
