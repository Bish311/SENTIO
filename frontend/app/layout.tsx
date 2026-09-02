import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "SENTIO — Autonomous Revenue Recovery",
  description: "Sense the failure. Guard the action. Recover the rupee.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sentio-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 w-full max-w-[1280px] mx-auto px-5 py-6 sm:px-8 sm:py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
