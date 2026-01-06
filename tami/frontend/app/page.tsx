'use client'

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="text-gray-500">טוען...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Hero Section */}
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-[#1F2937] leading-tight">
            הזיכרון של השיחות החשובות שלך
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            תיעוד מדויק בעברית של פגישות ושיחות עבודה –
            <br />
            עם סיכום, משימות, והבנה של מה באמת הוחלט.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            {user ? (
              <>
                <Link href="/record" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  הקלט פגישה חיה
                </Link>
                <Link href="/transcribe" className="border-2 border-gray-300 hover:border-gray-400 text-[#1F2937] px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  העלה הקלטה
                </Link>
                <Link href="/sessions" className="border-2 border-gray-300 hover:border-gray-400 text-[#1F2937] px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  הפגישות שלי
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg text-lg font-medium transition-colors">
                  התחבר
                </Link>
                <Link href="/about" className="border-2 border-gray-300 hover:border-gray-400 text-[#1F2937] px-10 py-4 rounded-lg text-lg font-medium transition-colors">
                  למד עוד
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Value Props Section */}
      <div className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <ValueCard
              icon={<SummaryIcon />}
              title="מה יצא מהשיחה"
              description="לא צריך להאזין שוב. תמי מסכמת החלטות, משימות ונקודות חשובות – בעברית ברורה."
            />
            <ValueCard
              icon={<HebrewIcon />}
              title="עברית, כמו שדיברת"
              description="מותאם לשיחות עבודה בעברית, כולל אנגלית באמצע, שמות וקיצורים. לא תרגום. הבנה."
            />
            <ValueCard
              icon={<PrivacyIcon />}
              title="המידע נשאר אצלך"
              description="בלי בוטים בשיחה. בלי להודיע לצד השני. בלי הפתעות."
            />
            <ValueCard
              icon={<AskIcon />}
              title="אפשר לשאול את השיחה"
              description="רוצה לדעת מה הוחלט? מי אחראי למה? פשוט שואלים."
            />
          </div>
        </div>
      </div>

      {/* Footer CTA Section */}
      {!user && (
        <div className="py-20 px-4 bg-white">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-bold text-[#1F2937]">
              מוכנים להפסיק לרדוף אחרי סיכומים?
            </h2>
            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg text-lg font-medium transition-colors inline-block">
              התחבר והתחל שיחה
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-xl">
      <div className="text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-[#1F2937] mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

// Subtle gray icons
function SummaryIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function HebrewIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  )
}

function PrivacyIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function AskIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
