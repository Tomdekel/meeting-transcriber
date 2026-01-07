'use client'

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]" dir="rtl">
        <div className="text-[#6B7280]">טוען...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]" dir="rtl">
      {/* Hero Section - Centered, narrow container */}
      <section className="pt-[100px] px-6">
        <div className="max-w-[700px] mx-auto text-center">
          {/* H1 */}
          <h1 className="text-[40px] md:text-[48px] font-bold text-[#111827] leading-[1.15]">
            הזיכרון של השיחות החשובות שלך
          </h1>

          {/* Subheading - 16px below H1, larger text */}
          <p className="mt-4 text-[18px] md:text-[20px] text-[#4B5563] leading-[1.5]">
            תיעוד מדויק בעברית של פגישות ושיחות עבודה – עם סיכום, משימות, והבנה של מה באמת הוחלט.
          </p>

          {/* CTA Buttons - 20px below subheading, tightly grouped */}
          <div className="mt-5 flex flex-row gap-3 justify-center">
            {user ? (
              <>
                <Link
                  href="/conversations/new"
                  className="h-[46px] px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold rounded-[8px] transition-colors inline-flex items-center justify-center"
                >
                  שיחה חדשה
                </Link>
                <Link
                  href="/conversations"
                  className="h-[46px] px-6 bg-white border border-[#D1D5DB] hover:border-[#9CA3AF] text-[#374151] text-[15px] font-medium rounded-[8px] transition-colors inline-flex items-center justify-center"
                >
                  השיחות שלי
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="h-[46px] px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold rounded-[8px] transition-colors inline-flex items-center justify-center"
                >
                  התחבר
                </Link>
                <Link
                  href="/about"
                  className="h-[46px] px-7 bg-white border border-[#D1D5DB] hover:border-[#9CA3AF] text-[#374151] text-[15px] font-medium rounded-[8px] transition-colors inline-flex items-center justify-center"
                >
                  למד עוד
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Value Props Section - 56px below hero, strict 3-column grid */}
      <section className="mt-14 px-6">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ValueCard
              icon={<SummaryIcon />}
              title="מה יצא מהשיחה"
              description="תמי מסכמת החלטות, משימות ונקודות חשובות – בעברית ברורה."
            />
            <ValueCard
              icon={<HebrewIcon />}
              title="עברית, כמו שדיברת"
              description="מותאם לשיחות עבודה בעברית, כולל אנגלית באמצע ושמות."
            />
            <ValueCard
              icon={<AskIcon />}
              title="אפשר לשאול את השיחה"
              description="רוצה לדעת מה הוחלט? מי אחראי למה? פשוט שואלים."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA Section - 120px below cards */}
      {!user && (
        <section className="mt-[120px] py-16 px-6 bg-white">
          <div className="max-w-[500px] mx-auto text-center">
            <h2 className="text-[24px] font-bold text-[#111827] mb-4">
              מוכנים להפסיק לרדוף אחרי סיכומים?
            </h2>
            <Link
              href="/login"
              className="h-[46px] px-7 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold rounded-[8px] transition-colors inline-flex items-center justify-center"
            >
              התחבר והתחל שיחה
            </Link>
          </div>
        </section>
      )}

      {/* Bottom spacing when logged in */}
      {user && <div className="h-[120px]" />}
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="bg-white p-5 rounded-[10px] text-center"
      style={{ boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)' }}
    >
      <div className="text-[#9CA3AF] mb-3 flex justify-center">
        {icon}
      </div>
      <h3 className="text-[16px] font-bold text-[#111827] mb-2">{title}</h3>
      <p className="text-[14px] text-[#6B7280] leading-[1.5]">{description}</p>
    </div>
  )
}

// Icons
function SummaryIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function HebrewIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  )
}

function AskIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
