import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** The dashed "+ Ajouter …" button that sits right under a page's hero card. */
export function AddLink({ href, label, className }: { href: string; label: string; className: string }) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3.5 text-sm font-semibold",
        className,
      )}
    >
      <Plus className="h-4 w-4" />
      {label}
    </Link>
  );
}
