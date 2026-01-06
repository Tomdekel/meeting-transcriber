'use client'

import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-text-primary">
            תמי
          </Link>
          <Link href="/login" className="btn-primary px-6 py-2">
            התחבר
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-text-primary">אודות תמי</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            תמלול חכם לפגישות - AI מתקדם לעסקים ישראליים
          </p>
        </section>

        {/* What is Tami */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-text-primary">מה זה תמי?</h2>
          <div className="prose text-text-secondary space-y-4">
            <p className="text-lg leading-relaxed">
              תמי היא מערכת תמלול חכמה שנבנתה במיוחד לעברית. המערכת מאפשרת לך להקליט
              פגישות, להעלות הקלטות קיימות, או להאזין לשיחות זום/גוגל מיט/טימס - ולקבל
              תמלול מדויק עם זיהוי דוברים אוטומטי.
            </p>
            <p className="text-lg leading-relaxed">
              אחרי התמלול, תמי מנתחת את השיחה ומספקת סיכום חכם עם נקודות עיקריות,
              החלטות שהתקבלו ופעולות מעקב. אפשר גם לשאול שאלות על התוכן ולקבל תשובות
              מדויקות בזמן אמת.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-text-primary">איך זה עובד?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-surface rounded-lg p-6 border border-border">
              <div className="text-4xl mb-4">1️⃣</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">העלה או הקלט</h3>
              <p className="text-text-secondary">
                הקלט פגישה חיה, האזן לשיחת זום/טימס, או העלה קובץ הקלטה קיים
              </p>
            </div>
            <div className="bg-surface rounded-lg p-6 border border-border">
              <div className="text-4xl mb-4">2️⃣</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">תמלול אוטומטי</h3>
              <p className="text-text-secondary">
                מודל Ivrit מתמלל את ההקלטה בדיוק גבוה עם זיהוי דוברים אוטומטי
              </p>
            </div>
            <div className="bg-surface rounded-lg p-6 border border-border">
              <div className="text-4xl mb-4">3️⃣</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">קבל תובנות</h3>
              <p className="text-text-secondary">
                סיכום חכם, נקודות עיקריות, פעולות מעקב ואפשרות לשאול שאלות
              </p>
            </div>
          </div>
        </section>

        {/* Free & Built by Tom */}
        <section className="bg-primary-light rounded-lg p-8 space-y-4">
          <h2 className="text-3xl font-bold text-text-primary">חינמי ופתוח</h2>
          <div className="text-text-secondary space-y-4">
            <p className="text-lg leading-relaxed">
              תמי נבנתה על ידי <strong>תום דקל</strong> כפרויקט למידה בעולם ה-"Vibe Coding" -
              בניית מוצרים טכנולוגיים בעזרת AI בצורה מהירה ויעילה.
            </p>
            <p className="text-lg leading-relaxed">
              המערכת <strong>חינמית לשימוש</strong> כרגע ופתוחה לכולם. המטרה היא לספק
              כלי תמלול איכותי לקהילה הישראלית.
            </p>
          </div>
        </section>

        {/* Why Ivrit Model */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-text-primary">למה מודל Ivrit?</h2>
          <div className="text-text-secondary space-y-4">
            <p className="text-lg leading-relaxed">
              מודל <strong>Ivrit</strong> הוא מודל הזיהוי הקולי הטוב ביותר לעברית שקיים היום.
              בניגוד למודלים כלליים כמו Whisper שאומנו על אנגלית בעיקר, Ivrit אומן במיוחד
              על עברית ומבין את המבטא, ההטעמה והמילים הייחודיות לשפה.
            </p>
            <p className="text-lg leading-relaxed">
              המודל כולל גם <strong>זיהוי דוברים אוטומטי</strong> (Speaker Diarization) -
              כך שתמי יודעת להפריד בין הדוברים השונים בשיחה ולסמן מי אמר מה.
            </p>
          </div>
        </section>

        {/* Post-Processing */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-text-primary">פוסט-פרוססינג חכם</h2>
          <div className="text-text-secondary space-y-4">
            <p className="text-lg leading-relaxed">
              אחרי התמלול הראשוני, תמי מעבירה את הטקסט דרך שכבת עיבוד נוספת עם
              <strong> GPT-4o</strong>. השכבה הזו מתקנת שגיאות הקלדה, משפרת פיסוק ומוסיפה
              הקשר - כך שהתמלול הסופי קריא ומדויק יותר.
            </p>
            <p className="text-lg leading-relaxed">
              GPT-4o גם אחראי על יצירת הסיכום החכם, זיהוי נקודות מפתח, והפקת פעולות
              המעקב מתוך השיחה.
            </p>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-text-primary">אבטחה ופרטיות</h2>
          <div className="text-text-secondary space-y-4">
            <p className="text-lg leading-relaxed">
              <strong>ההקלטות שלך פרטיות.</strong> הקבצים מאוחסנים בצורה מאובטחת ב-Supabase
              Storage עם הצפנה. רק אתה יכול לגשת לתמלילים והסיכומים שלך.
            </p>
            <p className="text-lg leading-relaxed">
              המערכת משתמשת ב-<strong>Supabase</strong> לאימות משתמשים ואחסון נתונים -
              פלטפורמה מאובטחת שעומדת בתקני אבטחה מחמירים.
            </p>
            <p className="text-lg leading-relaxed">
              <strong>אנחנו לא משתמשים בנתונים שלך לאימון מודלים</strong> - ההקלטות
              והתמלילים נשארים שלך בלבד.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-6 pt-8">
          <h2 className="text-3xl font-bold text-text-primary">מוכנים להתחיל?</h2>
          <div className="flex justify-center gap-4">
            <Link href="/login" className="btn-primary px-8 py-4 text-lg">
              התחבר עכשיו
            </Link>
            <Link href="/" className="btn-secondary px-8 py-4 text-lg">
              חזור לדף הבית
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-text-tertiary text-sm">
          נבנה על ידי תום דקל | Vibe Coding 2025
        </div>
      </footer>
    </div>
  )
}
