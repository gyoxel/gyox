"use client";

import type { DepositSource, PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

const PICTURES: Record<PaymentMethod, { src: string; width: number; height: number }> = {
  cash: { src: "/icons/cash.png", width: 132, height: 68 },
  card: { src: "/icons/card.png", width: 132, height: 75 },
};

/**
 * Cash (a bundle of 200 DH notes) or the bank card, as a small picture a
 * little lower than the text around it (it's wide) — in place of the 💵 /
 * 💳 emoji. The savings keep their 🐷.
 */
export function MethodIcon({ method, className }: { method: PaymentMethod | DepositSource; className?: string }) {
  if (method === "savings") {
    return (
      <span aria-hidden className={cn("leading-none", className)}>
        🐷
      </span>
    );
  }
  const { src, width, height } = PICTURES[method];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      width={width}
      height={height}
      draggable={false}
      className={cn("inline-block h-[0.8em] w-auto shrink-0 select-none align-[-0.06em]", className)}
    />
  );
}

/** "[💵] Espèces" / "[💳] Carte": the picture and the method's name. */
export function MethodLabel({ method, className }: { method: PaymentMethod; className?: string }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap align-baseline", className)}>
      <MethodIcon method={method} />
      {t(METHOD_META[method].label)}
    </span>
  );
}
