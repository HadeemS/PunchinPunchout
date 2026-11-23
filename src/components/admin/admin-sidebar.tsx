"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Clock,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/time-entries", label: "Time Entries", icon: Clock },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-50 text-emerald-700"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-emerald-600" : "text-zinc-400"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({
  userName,
  align,
  fullWidth,
}: {
  userName: string;
  align: "start" | "end";
  fullWidth?: boolean;
}) {
  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto gap-2 rounded-xl px-2 py-1.5",
            fullWidth && "w-full justify-start"
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
            {initial}
          </span>
          <span className="max-w-[10rem] truncate text-sm font-medium">
            {userName}
          </span>
          <ChevronDown className="ml-auto h-4 w-4 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="truncate">{userName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/change-password" className="cursor-pointer">
            <KeyRound className="h-4 w-4 text-zinc-500" />
            Change password
          </Link>
        </DropdownMenuItem>
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="w-full cursor-pointer text-left text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminSidebar({
  businessName,
  userName,
}: {
  businessName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Clock className="h-4 w-4" />
          </span>
          <span className="truncate text-base font-semibold text-zinc-900">
            {businessName}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-zinc-200 p-3">
          <UserMenu userName={userName} align="start" fullWidth />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="truncate text-base font-semibold text-zinc-900">
            {businessName}
          </span>
        </div>
        <UserMenu userName={userName} align="end" />
      </header>

      {/* Mobile overlay menu */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-sm">
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
              <span className="truncate text-base font-semibold text-zinc-900">
                {businessName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavLinks
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
