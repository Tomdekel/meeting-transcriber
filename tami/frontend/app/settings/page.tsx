"use client";

import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">הגדרות</h1>
          <p className="text-sm text-muted-foreground mt-1">
            נהל את ההגדרות וההעדפות שלך
          </p>
        </div>

        <Card className="p-8 text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">בקרוב</h2>
          <p className="text-muted-foreground">
            דף ההגדרות יהיה זמין בקרוב
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
