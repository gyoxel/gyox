"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Home, LineChart, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/credits", label: "Crédits", icon: Wallet },
  { href: "/budget", label: "Budget", icon: CalendarRange },
  { href: "/timeline", label: "Timeline", icon: LineChart },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
