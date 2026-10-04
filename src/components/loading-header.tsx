"use client";

import { usePathname } from "next/navigation";
import { pageColor } from "@/lib/page-theme";
import { ThemeColor } from "@/components/theme-color";

/** While a page loads, its header already in the page's colour (no grey flash). */
export function LoadingHeader() {
  const color = pageColor(usePathname());
  return (
    <div
      data-tone
      className="sticky top-0 z-30 flex h-[68px] items-center gap-3 rounded-b-[28px] px-4 pb-3 pt-3"
      style={{ backgroundColor: color }}
    >
      <ThemeColor color={color} />
      <div className="h-10 w-10 animate-pulse rounded-full bg-white/25" />
      <div className="h-5 w-32 flex-1 animate-pulse rounded-md bg-white/25" />
      <div className="h-10 w-10 animate-pulse rounded-full bg-white/25" />
    </div>
  );
}
