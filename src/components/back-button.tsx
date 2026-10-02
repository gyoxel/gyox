"use client";

import { ChevronLeft } from "lucide-react";
import { useNavBack } from "@/lib/nav-history";

/** Header back arrow: the previous page, or home on the session's first page. */
export function BackButton() {
  const nav = useNavBack();
  return (
    <button
      type="button"
      onClick={() => nav.back()}
      aria-label="Retour"
      className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}
