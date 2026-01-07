'use client'

import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA]" dir="rtl">
      <main className="max-w-[760px] mx-auto px-6 py-16">

        {/* Header */}
        <section className="mb-12">
          <h1 className="text-[30px] font-bold text-[#1F2937] mb-4">
            אודות תמי
          </h1>
          <h2 className="text-[20px] font-semibold text-[#1F2937]">
            כלי תיעוד שיחות בעברית — ברור, שקט, ואמין.
          </h2>
        </section>

        {/* מהי תמי? */}
        <section className="mb-12">
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-4">
            מהי תמי?
          </h2>
          <div className="text-[16px] text-[#6B7280] leading-[1.6] space-y-4">
            <p>
              תמי היא מערכת שמבינה שיחות עבודה בעברית ומסכמת אותן בצורה מדויקת וברורה.
              היא נבנתה כדי לאפשר לך להקליט פגישות, לנתח אותן, ולחזור אל מה שבאמת חשוב — בלי להקשיב שוב ובלי לפספס.
            </p>
            <p>אחרי כל שיחה, תמי מציגה:</p>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li>החלטות</li>
              <li>משימות ואחריות</li>
              <li>נקודות חשובות</li>
              <li>תמלול מלא וחיפוש לפי תוכן</li>
            </ul>
            <p>המטרה פשוטה: שהמידע הקריטי יישאר נגיש, מסודר, ואמין.</p>
          </div>
        </section>

        {/* למה תמי קיימת? */}
        <section className="mb-12">
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-4">
            למה תמי קיימת?
          </h2>
          <div className="text-[16px] text-[#6B7280] leading-[1.6] space-y-4">
            <p>
              תמי נולדה מתוך צורך אישי.
              חיפשתי כלי שיתמלל שיחות עבודה בעברית בצורה מדויקת וגמישה שמתאימה לאופן שבו אני עובד ונפגש עם אנשים בחיים האמיתיים — ולא מצאתי.
            </p>
            <p>
              רציתי מערכת שבנויה לעברית מהבסיס, ושיודעת גם לקבל קונטקסט על מהות הפגישה כדי לשפר משמעותית את התוצאה.
            </p>
            <p>תמי נועדה לעזור:</p>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li>לצמצם אי־בהירויות</li>
              <li>לוודא הסכמות</li>
              <li>לזהות משימות פתוחות</li>
              <li>ולתת תחושת ביטחון שלא מפספסים שום דבר שנאמר</li>
            </ul>
          </div>
        </section>

        {/* איך זה עובד? */}
        <section className="mb-12">
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-4">
            איך זה עובד?
          </h2>
          <div className="text-[16px] text-[#6B7280] leading-[1.6] space-y-4">
            <ol className="list-decimal list-inside space-y-2 pr-2">
              <li>מקליטים שיחה או מעלים הקלטה קיימת</li>
              <li>תמי מתמללת ומזהה דוברים בצורה מדויקת</li>
              <li>התמלול עובר למודל שפה חזק נוסף יחד עם הקונטקסט של הפגישה לצורך דיוק עמוק יותר</li>
              <li>מתקבל סיכום תמציתי הכולל החלטות, משימות ותובנות</li>
              <li>ניתן לשאול את תמי שאלות על השיחה ולקבל תשובות מדויקות בזמן אמת</li>
            </ol>
            <p>אין צורך בהתקנות, אין בוט בשיחה, ואין צורך לבקש רשות מהצד השני.</p>
          </div>
        </section>

        {/* למה דווקא עברית? */}
        <section className="mb-12">
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-4">
            למה דווקא עברית?
          </h2>
          <div className="text-[16px] text-[#6B7280] leading-[1.6] space-y-4">
            <p>
              עברית מדוברת מורכבת: קצב משתנה, עירוב אנגלית, שמות, קיצורים ומושגים פנימיים.
              רוב המודלים הגנריים לא מותאמים לזה — תמי כן.
            </p>
            <p>
              המערכת מאומנת במיוחד להבנת עברית בשיחות עבודה אמיתיות, כך שהתוצאות קריאות, טבעיות, ונאמנות למה שנאמר.
            </p>
          </div>
        </section>

        {/* פרטיות ואמון */}
        <section className="mb-12">
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-4">
            פרטיות ואמון
          </h2>
          <div className="text-[16px] text-[#6B7280] leading-[1.6] space-y-4">
            <p>
              הפרטיות שלך קודמת לכל.
              ההקלטות והתמלולים נשמרים בצורה מוגנת ונגישים רק לך — לא מועברים לאף גורם אחר.
            </p>
            <p>
              השיחות לא משמשות לאימון מודלים נוספים.
              התוכן שלך נשאר בשליטה מלאה שלך, כולל מחיקה בכל רגע.
            </p>
          </div>
        </section>

        {/* CTA Footer */}
        <footer className="pt-12 border-t border-[#E6E8EC]">
          <h2 className="text-[20px] font-semibold text-[#1F2937] mb-6">
            מוכנים להתחיל?
          </h2>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="bg-[#2B3A67] hover:bg-[#1F2937] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              התחבר עכשיו
            </Link>
            <Link
              href="/"
              className="border-2 border-[#E6E8EC] hover:border-[#6B7280] text-[#1F2937] px-6 py-3 rounded-lg font-medium transition-colors"
            >
              חזור לדף הבית
            </Link>
          </div>
        </footer>

      </main>
    </div>
  )
}
