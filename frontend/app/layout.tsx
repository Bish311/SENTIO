import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "SENTIO — Autonomous Revenue Recovery Layer",
  description: "Sense the failure. Guard the action. Recover the rupee.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-[#b0cde6] dark:selection:bg-[#a56f63]">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="py-6 border-t border-inherit text-center text-xs text-slate-500 dark:text-slate-400">
            SENTIO — Autonomous Revenue Recovery · Razorpay AI Buildathon 2026
          </footer>
        </div>
      </body>
    </html>
  );
}
