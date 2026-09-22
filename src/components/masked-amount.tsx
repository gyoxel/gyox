"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function MaskedAmount({ value, className, buttonClassName }: { value: string; className?: string; buttonClassName?: string }) {
  const [revealed, setRevealed] = useState(false);

  // A 3-column grid keeps the amount truly centered in the row — the eye
  // button sits off to the side in its own column instead of being part of
  // the centered group (which would drag the amount off-center).
  return (
    <span className="grid w-full grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
      <span aria-hidden className="h-7 w-7" />
      <span className={cn(className, "text-center", !revealed && "tracking-widest")}>
        {revealed ? value : "**** DH"}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? "Masquer le montant" : "Afficher le montant"}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-current opacity-70 transition-colors hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10",
          buttonClassName,
        )}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  );
}
