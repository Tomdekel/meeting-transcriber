"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old /record route to new conversation flow
export default function RecordPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/conversations/new");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center" dir="rtl">
      <div className="text-[#6B7280]">מעביר לעמוד החדש...</div>
    </div>
  );
}
