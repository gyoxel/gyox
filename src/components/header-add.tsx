"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { HEADER_BUTTON } from "@/components/header-button";

/** Fired by the header's "+" on pages whose add is a dialog (Épargne, Catégories). */
export const HEADER_ADD_EVENT = "gx:header-add";

/** The header's "+": opens the page's add form (a page, or the page's dialog). */
export function HeaderAdd({ href, label = "Ajouter" }: { href?: string; label?: string }) {
  if (href) {
    return (
      <Link href={href} prefetch aria-label={label} className={HEADER_BUTTON}>
        <Plus className="h-5 w-5" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={() => window.dispatchEvent(new Event(HEADER_ADD_EVENT))} className={HEADER_BUTTON}>
      <Plus className="h-5 w-5" />
    </button>
  );
}
