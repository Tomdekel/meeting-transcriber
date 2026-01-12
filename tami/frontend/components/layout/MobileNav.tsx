"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  MessageSquare,
  Search,
  Tag,
  Users,
  Settings,
  LogOut,
  Plus,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors",
        active && "text-foreground bg-muted"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-base font-medium">{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/conversations", icon: MessageSquare, label: "שיחות" },
    { href: "/search", icon: Search, label: "חיפוש" },
    { href: "/entities", icon: Users, label: "ישויות" },
    { href: "/tags", icon: Tag, label: "תגיות" },
  ];

  const closeSheet = () => setOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border flex items-center justify-between px-4 z-50 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold">תמי</span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">פתח תפריט</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="px-4 py-5 border-b">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Mic className="h-4 w-4 text-white" />
                </div>
                <span>תמי</span>
              </SheetTitle>
            </SheetHeader>

            {/* New Conversation Button */}
            <div className="p-4">
              <Button
                asChild
                className="w-full gradient-accent text-white hover:opacity-90"
                onClick={closeSheet}
              >
                <Link href="/conversations?new=true">
                  <Plus className="h-4 w-4 me-2" />
                  שיחה חדשה
                </Link>
              </Button>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname.startsWith(item.href)}
                  onClick={closeSheet}
                />
              ))}
            </nav>

            <Separator />

            {/* Bottom Section */}
            <div className="px-3 py-4 space-y-1">
              <NavItem
                href="/settings"
                icon={Settings}
                label="הגדרות"
                active={pathname === "/settings"}
                onClick={closeSheet}
              />
              {user && (
                <button
                  onClick={() => {
                    signOut();
                    closeSheet();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-foreground/70 hover:text-red-500 hover:bg-muted transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="text-base font-medium">התנתק</span>
                </button>
              )}
            </div>

            {/* User Info */}
            {user && (
              <div className="px-4 py-3 border-t mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
