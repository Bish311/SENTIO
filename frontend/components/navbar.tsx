"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";
import { Activity, BookOpen, Settings } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { data: health } = useSWR("/health", fetcher, { refreshInterval: 5000 });

  const navItems = [
    { href: "/", label: "Command Center", icon: Activity },
    { href: "/ledger", label: "Two-Arm Ledger", icon: BookOpen },
    { href: "/admin", label: "Admin Console", icon: Settings },
  ];

  const isHealthy = health?.status === "ok";

  return (
    <header className="sticky top-0 z-50 custom-surface border-b backdrop-blur-md px-6 py-3.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg bg-gradient-to-br from-[#b0cde6] to-[#a290b7] dark:from-[#a56f63] dark:to-[#464858] text-slate-900 dark:text-white shadow-sm transition-transform group-hover:scale-105">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-lg leading-tight">
                SENTIO
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold uppercase bg-[#a290b7]/20 text-[#a290b7] dark:bg-[#a56f63]/30 dark:text-[#f8fafc]">
                  v1
                </span>
              </div>
              <p className="text-[10px] text-muted tracking-wider uppercase font-medium">
                Autonomous Revenue Recovery
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/60 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium custom-card">
            {isHealthy ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 dark:text-emerald-400">Spine Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-700 dark:text-amber-400">Connecting...</span>
              </>
            )}
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
