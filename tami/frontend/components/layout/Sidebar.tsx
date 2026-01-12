"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
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
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
        active && "text-sidebar-foreground bg-sidebar-accent"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/conversations", icon: MessageSquare, label: "שיחות" },
    { href: "/search", icon: Search, label: "חיפוש" },
    { href: "/entities", icon: Users, label: "ישויות" },
    { href: "/tags", icon: Tag, label: "תגיות" },
  ];

  return (
    <aside className="fixed top-0 right-0 h-screen w-64 bg-sidebar flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold text-sidebar-foreground">תמי</span>
      </div>

      {/* New Conversation Button */}
      <div className="px-3 pb-4">
        <Button
          asChild
          className="w-full gradient-accent text-white hover:opacity-90"
        >
          <Link href="/conversations?new=true">
            <Plus className="h-4 w-4 me-2" />
            שיחה חדשה
          </Link>
        </Button>
      </div>

      <Separator className="bg-sidebar-accent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <Separator className="bg-sidebar-accent" />

      {/* Bottom Section */}
      <div className="px-3 py-4 space-y-1">
        <NavItem
          href="/settings"
          icon={Settings}
          label="הגדרות"
          active={pathname === "/settings"}
        />
        {user && (
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">התנתק</span>
          </button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 border-t border-sidebar-accent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-medium text-sidebar-foreground">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
