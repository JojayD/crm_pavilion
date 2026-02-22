"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Repeat2,
  Workflow,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Sequences", href: "/sequences", icon: Repeat2 },
  { label: "Workflows", href: "/workflows", icon: Workflow },
];

type SidebarProps = {
  user: { name: string; email: string };
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center px-5">
        <span className="text-lg font-bold text-blue-600">Supa sick CRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-blue-600" : "text-gray-400"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-600">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {user.name}
          </p>
          <p className="truncate text-xs text-gray-500">Admin Plan</p>
        </div>
      </div>
    </aside>
  );
}
