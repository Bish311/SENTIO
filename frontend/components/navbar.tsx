"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";
import { Activity, Settings, Zap } from "lucide-react";

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
    { href: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b px-6 py-2.5"
      style={{ background: "#0b0c0f", borderColor: "var(--border-color)" }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 font-mono font-black text-[11px] flex items-center justify-center">
              S
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white block leading-none font-mono">
                SENTIO
              </span>
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase block mt-0.5">
                REVENUE RECOVERY OPS
              </span>
            </div>
          </Link>

          <span className="text-zinc-700 hidden md:inline">&middot;</span>
          <span className="text-[11px] font-mono text-zinc-400 tracking-wider uppercase hidden lg:inline">
            PAYMENT RELIABILITY &amp; REVENUE RECOVERY ENGINE
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {links.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                  active
                    ? "bg-zinc-800/80 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="pill text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/40 tracking-wider">
            RAZORPAY TEST MODE
          </span>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold"
            style={{
              background: isHealthy ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              color: isHealthy ? "#10b981" : "#f59e0b",
              border: isHealthy ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-amber-500"}`}
              style={isHealthy ? { animation: "pulse 2s ease-in-out infinite" } : {}}
            />
            <span>{isHealthy ? "SPINE API" : "CONNECTING..."}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
