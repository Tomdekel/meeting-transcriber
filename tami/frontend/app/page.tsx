'use client'

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth()

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
                <Link href="/record" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  הקלט פגישה חיה
                </Link>
                <Link href="/transcribe" className="btn-secondary px-8 py-4 text-lg inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  העלה הקלטה
                </Link>
                <Link href="/sessions" className="btn-secondary px-8 py-4 text-lg inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  הפגישות שלי
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-primary px-8 py-4 text-lg">
                  התחבר
                </Link>
                <Link href="/about" className="btn-secondary px-8 py-4 text-lg">
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
              description="מודל Ivrit - הטוב ביותר לעברית, עם זיהוי דוברים אוטומטי"
            />
            <FeatureCard
              icon="💡"
              title="תובנות"
              description="קבל סיכום חכם של השיחה, כולל נקודות עיקריות ופעולות למעקב"
            />
            <FeatureCard
              icon="⚡"
              title="מהיר ויעיל"
              description="תמלול מהיר עם תוצאות באיכות גבוהה"
            />
            <FeatureCard
              icon="🔒"
              title="מאובטח"
              description="המידע שלך נשמר באופן מאובטח ופרטי"
            />
            <FeatureCard
              icon="🔄"
              title="גמישות מלאה"
              description="שיחות זום/גוגל מיט/טימס, הקלטת שיחות לייב, שימוש בהקלטות קיימות - עובדים עם הכל"
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
