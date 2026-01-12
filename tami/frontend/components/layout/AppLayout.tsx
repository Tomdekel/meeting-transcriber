"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSearch } from "@/components/search/GlobalSearch";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="lg:mr-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 lg:p-8">{children}</div>
      </main>

      {/* Global Search (Cmd+K) */}
      <GlobalSearch />

      {/* Toast notifications */}
      <Toaster position="bottom-left" />
    </div>
  );
}
