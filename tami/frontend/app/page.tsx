import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Settings Link */}
      <Link
        href="/settings"
        className="fixed top-6 left-6 p-2 text-text-secondary hover:text-primary transition-colors"
        title="הגדרות"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>

      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-text-primary">
            תמי
          </h1>
          <p className="text-2xl text-text-secondary">
            תמלול חכם לפגישות
          </p>
        </div>

        <div className="space-y-3 max-w-md mx-auto">
          <p className="text-text-secondary leading-relaxed">
            העלה קובץ אודיו, קבל תמלול מדויק עם זיהוי דוברים, סיכום חכם ואפשרות לשאול שאלות על הפגישה
          </p>
        </div>

        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <Link
            href="/record"
            className="btn-primary inline-flex items-center justify-center gap-2 py-4"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span>הקלטת פגישה חיה</span>
          </Link>

          <div className="flex gap-4">
            <Link
              href="/transcribe"
              className="btn-secondary inline-flex items-center justify-center gap-2 flex-1"
            >
              <span>העלאת קובץ קיים</span>
            </Link>

            <Link
              href="/sessions"
              className="btn-secondary inline-flex items-center justify-center gap-2 flex-1"
            >
              <span>פגישות קודמות</span>
            </Link>
          </div>
        </div>

        <div className="pt-8">
          <div className="inline-flex items-center gap-6 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>תמיכה מלאה בעברית</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>זיהוי דוברים</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>סיכום אוטומטי</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
