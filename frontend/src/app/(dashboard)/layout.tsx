"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";
import clsx from "clsx";
import {
  LayoutDashboard,
  Radar,
  AtSign,
  Share2,
  MapPin,
  ListChecks,
  Users,
  FileStack,
  Download,
  Gauge,
  UsersRound,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scrape", label: "Scrape", icon: Radar },
  { href: "/email-finder", label: "Email finder", icon: AtSign },
  { href: "/social-extractor", label: "Social links", icon: Share2 },
  { href: "/places-finder", label: "Places finder", icon: MapPin },
  { href: "/jobs", label: "Jobs", icon: ListChecks },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/exports", label: "Exports", icon: Download },
  { href: "/usage", label: "Usage", icon: Gauge },
  { href: "/team", label: "Team", icon: UsersRound },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/scrape": "New scraping job",
  "/email-finder": "Email finder",
  "/social-extractor": "Social links extractor",
  "/places-finder": "Places finder",
  "/jobs": "Scraping history",
  "/leads": "Leads",
  "/templates": "Templates",
  "/exports": "Exports",
  "/usage": "Usage",
  "/team": "Team",
  "/billing": "Billing",
  "/settings": "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthGuard();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-50">
        <div className="flex items-center gap-2 text-ink-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-signal-amber" />
          Loading…
        </div>
      </div>
    );
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  }

  const title = PAGE_TITLES[pathname] || (pathname.startsWith("/jobs/") ? "Job details" : "Lead Console");
  const initial = (user?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-paper-50">
      <aside className="flex w-60 flex-col border-r border-paper-100 bg-ink-950 text-paper-50">
        <div className="flex items-center gap-2 border-b border-ink-800 px-5 py-5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-signal-amber font-display text-sm font-bold text-ink-950">
            L
          </span>
          <Link href="/" className="font-display text-base tracking-tight">Lead Console</Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-ink-800 text-paper-50"
                    : "text-paper-400 hover:bg-ink-900 hover:text-paper-50"
                )}
              >
                <span
                  className={clsx(
                    "h-4 w-0.5 rounded-full",
                    active ? "bg-signal-amber" : "bg-transparent"
                  )}
                />
                <Icon size={16} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-sm font-medium">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{user?.full_name || user?.email}</p>
              <p className="text-xs uppercase tracking-wide text-paper-400">{user?.plan || "free"} plan</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-1.5 text-sm text-paper-400 hover:text-signal-red"
          >
            <LogOut size={14} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-paper-100 bg-white px-8 py-4">
          <h1 className="font-display text-xl">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
