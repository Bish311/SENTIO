"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";
import { Activity, BookOpen, Settings } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { data: health } = useSWR("/health", fetcher, {
    refreshInterval: 5000,
    errorRetryInterval: 8000,
    shouldRetryOnError: true,
  });

  const isHealthy = health?.status === "ok";

  const links = [
    { href: "/", label: "Command Center", icon: Activity },
    { href: "/ledger", label: "Ledger", icon: BookOpen },
    { href: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b px-6 py-3.5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="max-w-[1360px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span
              className="font-extrabold text-lg tracking-wider"
              style={{ color: "var(--text-primary)" }}
            >
              SENTIO
            </span>
            <span
              className="pill text-[9px]"
              style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}
            >
              v1.0
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {links.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-semibold transition-all ${
                    active ? "shadow-sm" : ""
                  }`}
                  style={{
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                    background: active ? "var(--bg-surface)" : "transparent",
                    border: active ? "1px solid var(--border-color)" : "1px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3.5">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold"
            style={{
              background: isHealthy ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
              color: isHealthy ? "#059669" : "#d97706",
              border: isHealthy ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}
              style={isHealthy ? { animation: "pulse 2s ease-in-out infinite" } : {}}
            />
            {isHealthy ? "Spine Live" : "Connecting..."}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
